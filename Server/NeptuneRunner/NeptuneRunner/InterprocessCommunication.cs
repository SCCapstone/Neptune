﻿using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;

namespace NeptuneRunner {
    public class PipeDataReceivedEventArgs : EventArgs {
        public string Data;
        public PipeDataReceivedEventArgs(string data) {
            if (Data.StartsWith("\x02"))
                Data = Data.Substring(1);
            if (Data.EndsWith("\x03"))
                Data = Data.Substring(0, Data.Length - 1);
            Data = data;
        }
        public PipeDataReceivedEventArgs(byte[] data) {
            Data = Encoding.UTF8.GetString(data);
            if (Data.StartsWith("\x02"))
                Data = Data.Substring(1);
            if (Data.EndsWith("\x03"))
                Data = Data.Substring(0, Data.Length - 1);
        }

        public Dictionary<string, string> ToDictionary() {
            Dictionary<string, string> result = new Dictionary<string, string>();
            string[] dataSplit = Data.Split('\x1e');
            foreach (string s in dataSplit) {
                string[] keyValue = s.Split('\x1f');
                if (keyValue.Length == 2 && !result.ContainsKey(keyValue[0]))
                    result.Add(keyValue[0], keyValue[1]);
            }

            return result;
        }

        public JsonObject DecodeBase64String(string data) {
            int base64StartIndex = data.IndexOf("base64,") + "base64,".Length;
            string base64Data = data.Substring(base64StartIndex).Trim();
            byte[] jsonDataBytes = Convert.FromBase64String(base64Data);
            string jsonString = Encoding.UTF8.GetString(jsonDataBytes);
            dynamic deserializedObject = JsonObject.Parse(jsonString);
            return deserializedObject;
        }
    }

    public class InterprocessCommunication {
        public NamedPipeServerStream PipeServerStream;

        public string ClientKey { get; }
        public string Key { get; }
        public string Name { get; }


        private bool clientAuthenticated = false;
        public bool ClientAuthenticated { get { return clientAuthenticated; } }


        public void CreateNamedPipe() {
            PipeServerStream = new NamedPipeServerStream(Name, PipeDirection.InOut, NamedPipeServerStream.MaxAllowedServerInstances, PipeTransmissionMode.Message, PipeOptions.Asynchronous);
        }

        public IAsyncResult Listen() {
            return PipeServerStream.BeginWaitForConnection(ConnectionCallback, null);
        }

        public void ConnectionCallback(IAsyncResult resultConnection) {
            try {
                PipeServerStream.EndWaitForConnection(resultConnection);
            } catch (OperationCanceledException) {
                return;
            }

            Console.WriteLine("[Pipe-Server] Neptune Server connected");
            while (PipeServerStream.CanRead) {
                byte[] PipeDataBuffer = new byte[16];
                MemoryStream MessageStream = new MemoryStream();
                int TotalBytesRead = 0;

                do {
                    int BytesRead = PipeServerStream.Read(PipeDataBuffer, 0, PipeDataBuffer.Length);
                    MessageStream.Write(PipeDataBuffer, 0, BytesRead);
                    TotalBytesRead += BytesRead;
                } while (!PipeServerStream.IsMessageComplete);

                byte[] data = MessageStream.ToArray();
                if (data.Length == 0)
                    continue;

                if (!clientAuthenticated) {
                    string dataString = Encoding.UTF8.GetString(data);
                    if (dataString == "\x02" + "ckey\x1f" + ClientKey + "\x1e\x03") { //dataString.StartsWith("ckey:") && dataString.EndsWith(ClientKey)) {
                        clientAuthenticated = true;
                        SendData("\x02skey\x1f" + Key + "\x1e\x03");

                        Console.WriteLine("[Pipe-Server]: Authenticated");
                    }
                } else {
                    DataReceived.Invoke(this, new PipeDataReceivedEventArgs(data));
                }
            }

            PipeServerStream.Disconnect();
            PipeServerStream.BeginWaitForConnection(ConnectionCallback, null);
        }
        

        public void Disconnect() {
            if (PipeServerStream != null) {
                SendData("disconnect");
                PipeServerStream.Disconnect();
            }
        }

        public void Delete() {
            if (PipeServerStream != null) {
                PipeServerStream.Disconnect();
                PipeServerStream.Close();
                PipeServerStream = null;
            }
        }

        public bool WaitForClient() {
            if (PipeServerStream == null)
                return false;
            try {
                if (PipeServerStream.CanWrite)
                    return true;
                PipeServerStream.WaitForConnection();
                return true;
            } catch (Exception) {
                return false;
            }
        }

        public void SendData(string data) {
            try {
                if (PipeServerStream == null)
                    return;
                if (PipeServerStream.IsConnected && PipeServerStream.CanWrite) {
                    lock (PipeServerStream) {
                        byte[] bytes = Encoding.UTF8.GetBytes(data);
                        PipeServerStream.Write(bytes, 0, bytes.Length);
                        PipeServerStream.Flush();
                        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                            PipeServerStream.WaitForPipeDrain();
                    }
                }
            } catch (System.IO.IOException e) {
                Console.Error.WriteLine("[Pipe-Server] Error sending data: " + e.Message);
            }
        }

        public void SendData(Dictionary<string, string> data) {
            if (data.Count <= 0)
                return;
            string dataString = KeyValuePairsToDataString(data.Keys.ElementAt(0), data);
            SendData(dataString);
        }

        public string KeyValuePairsToDataString(string command, Dictionary<string, string> data) {
            string dataString = "\x02" + command + "\x1f\x1e";
            foreach (string s in data.Keys) {
                dataString += s;
                dataString += "\x1f";
                dataString += data[s];
                dataString += "\x1e";
            }
            dataString += "\x03";
            return dataString;
        }


        public event EventHandler<PipeDataReceivedEventArgs> DataReceived;


        public InterprocessCommunication(string name, string serverKey, string clientKey = "") {
            if (clientKey == "")
                clientKey = serverKey;
            Name = name;
            Key = serverKey;
            ClientKey = clientKey;
        }
    }
}
