@echo off
del dist\513baa13871a954a5b75b2da32de654f.node
move dist\88af812b4c74a9ed091c5173105490fb.node dist\513baa13871a954a5b75b2da32de654f.node

del dist\1d352788e97c79d258b3ac1a9ee79a0f.node
move dist\1358bf7d4c674875baa4c95d1bc78bbf.node dist\1d352788e97c79d258b3ac1a9ee79a0f.node


rem inside the node_modules folder
del node_modules\@nodegui\nodegui\build\Release\513baa13871a954a5b75b2da32de654f.node
copy node_modules\@nodegui\nodegui\build\Release\nodegui_core.node node_modules\@nodegui\nodegui\build\Release\513baa13871a954a5b75b2da32de654f.node

del node_modules\keytar\build\Release\1d352788e97c79d258b3ac1a9ee79a0f.node
copy node_modules\keytar\build\Release\keytar.node node_modules\keytar\build\Release\1d352788e97c79d258b3ac1a9ee79a0f.node
@echo on