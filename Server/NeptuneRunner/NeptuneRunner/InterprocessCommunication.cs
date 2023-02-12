﻿using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace NeptuneRunner {
    public class PipeDataReceivedEventArgs : EventArgs {
        private bool alreadyProcessed = false;

        public string Data;
        public PipeDataReceivedEventArgs(string data) {
            Data = data;
        }
        public PipeDataReceivedEventArgs(byte[] data) {
            Data = Encoding.ASCII.GetString(data);
        }

        public Dictionary<string, string> ToDictionary() {
            Dictionary<string, string> result = new Dictionary<string, string>();

            if (Data.StartsWith("\x02"))
                Data = Data.Substring(1);
            if (Data.EndsWith("\x03"))
                Data = Data.Substring(0, Data.Length - 1);

            string[] dataSplit = Data.Split("\x1e");
            foreach (string s in dataSplit) {
                string[] keyValue = s.Split("\x1f");
                if (keyValue.Length == 2)
                    result.Add(keyValue[0], keyValue[1]);
            }

            return result;
        }

        /// <summary>
        /// Checks if the data received is JSON data
        /// </summary>
        /// <returns>Data received is likely JSON data.</returns>
        public bool IsJson() {
            return (Data.StartsWith("{") && Data.EndsWith("}")) || (Data.StartsWith("[") && Data.EndsWith("]"));
        }
        /// <summary>
        /// Returns the data in a key pair
        /// </summary>
        /// <returns></returns>
        public Dictionary<string, string> FromJson() {
            try {
                return JsonSerializer.Deserialize<Dictionary<string, string>>(Data);
            } catch (JsonException) {
                return new Dictionary<string, string>();
            }
        }
    }

    public class InterprocessCommunication {
        public NamedPipeServerStream PipeServerStream;

        public string ClientKey { get; }
        public string Key { get; }
        public string Name { get; }


        private bool clientAuthenticated = false;


        public void CreateNamedPipe() {
            PipeServerStream = new NamedPipeServerStream(Name, PipeDirection.InOut, NamedPipeServerStream.MaxAllowedServerInstances, PipeTransmissionMode.Message);
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

            Console.WriteLine("[Pipe] Neptune Server connected");
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
                    string dataString = Encoding.ASCII.GetString(data);
                    if (dataString.StartsWith("ckey:") && dataString.EndsWith(ClientKey)) {
                        clientAuthenticated = true;
                        SendData("skey:" + Key);

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
                        PipeServerStream.Write(Encoding.UTF8.GetBytes(data));
                        PipeServerStream.WaitForPipeDrain();
                    }
                }
            } catch (System.IO.IOException e) {
                Console.Error.WriteLine("[Pipe] Error sending data: " + e.Message);
            }
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
