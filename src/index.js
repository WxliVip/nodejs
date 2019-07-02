var db = require('./utils/db')

// 测试
db.find("DIC_SYS_CODE",{ ID: '5'}).then(res=>{
    console.log(res.recordset)
})