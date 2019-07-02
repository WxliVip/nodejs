const mssql = require("mssql");
const log = require("./log");
const logger = log.getLogger("db");
const connConfig = {
    user: 'sa',
    password: 'aaaaaa',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
    database: 'ZZSB',
    connectionTimeout: 120000,
    requestTimeout: 3000000,
    retryTimes: 3,
    options: {
        encrypt: true
    },
    pool: {
        max: 1024,
        min: 1,
        idleTimeoutMillis: 30000
    }
};
mssql.on('error', err => {
    // ... error handler
    logger.error(err);
});
let connectionPool;

var getConnection = async function () {//连接数据库
    if (!(connectionPool && connectionPool.connected)) {
        connectionPool = await mssql.connect(connConfig);
    }
    return connectionPool;
}

var query = async function (sql, params) {//写sql语句自由查询
    await mssql.close();// close
    var pool = await getConnection();
    var request = pool.request();
    if (params) {
        for (var index in params) {
            if (typeof params[index] == "number") {
                request.input(index, mssql.Int, params[index]);
            } else if (typeof params[index] == "string") {
                request.input(index, mssql.NVarChar, params[index]);
            }
        }
    }
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

var find = async function (tableName, whereObj) {//写sql语句自由查询
    await mssql.close();// close
    var sql = "SELECT * FROM "+ tableName;
    var pool = await getConnection();
    var request = pool.request();
    if (whereObj) {
        sql += " WHERE ";
        for (var index in whereObj) {
            if (typeof whereObj[index] == "number") {
                request.input(index, mssql.Int, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            } else if (typeof whereObj[index] == "string") {
                request.input(index, mssql.NVarChar, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            }
        }
        sql = sql.substring(0, sql.length - 5);
    }
    logger.info(sql)
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

var add = async function (tableName, addObj) {//添加数据
    if (!addObj) {
        return;
    }
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    var sql = "insert into " + tableName + "(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            request.input(index, mssql.Int, addObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index, mssql.NVarChar, addObj[index]);
        }
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1) + ") values(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            sql += "@" + index + ",";
        } else if (typeof addObj[index] == "string") {
            sql += "@" + index + ",";
        }
    }
    sql = sql.substring(0, sql.length - 1) + ")";

    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

var save = async function (tableName, addObj, whereObj) {//添加数据
    if (!addObj) {
        return;
    }
    if (!whereObj) {
        return await add(tableName, addObj);
    }
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    let sql = `BEGIN
    IF NOT EXISTS (SELECT 1 FROM ${tableName} WHERE 1 > 0`;

    for (var index in whereObj) {
        if (typeof addObj[index] == "number") {
            request.input(index + 'Where', mssql.Int, whereObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index + 'Where', mssql.NVarChar, whereObj[index]);
        }
        sql += ` AND ${index} = @${index}Where`
    }
    sql += ')';

    sql += 'BEGIN ';
    sql += "INSERT INTO " + tableName + "(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            request.input(index, mssql.Int, addObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index, mssql.NVarChar, addObj[index]);
        }
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1) + ") values(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            sql += "@" + index + ",";
        } else if (typeof addObj[index] == "string") {
            sql += "@" + index + ",";
        }
    }
    sql = sql.substring(0, sql.length - 1) + ")";

    sql += `   END
    END`;

    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};


var batch_add = async function (tableName, addObjs) {//添加数据
    if (!addObjs || addObjs.length == 0) {
        return;
    }
    await mssql.close();// close
    var connection = await getConnection();
    var sql = "INSERT INTO " + tableName + "(";
    if (addObjs) {
        let addObj = addObjs[0];
        for (var index in addObj) {
            sql += index + ",";
        }
        sql = sql.substring(0, sql.length - 1) + ") VALUES";
        addObjs.forEach(addObj => {
            sql = sql + "(";
            for (var index in addObj) {
                if (typeof addObj[index] == "number") {
                    sql += addObj[index] + ",";
                } else if (typeof addObj[index] == "string") {
                    sql += "N'" + addObj[index] + "'" + ",";
                }
            }
            sql = sql.substring(0, sql.length - 1) + "),";
        });
    }
    sql = sql.substring(0, sql.length - 1);
    var result = await connection.request().query(sql);
    await mssql.close();// close
    return result;
};

var update = async function (tableName, updateObj, whereObj) {//更新数据
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    var sql = "UPDATE " + tableName + " SET ";
    if (updateObj) {
        for (var index in updateObj) {
            if (typeof updateObj[index] == "number") {
                request.input(index, mssql.Int, updateObj[index]);
                sql += index + "=@" + index + ",";
            } else if (typeof updateObj[index] == "string") {
                request.input(index, mssql.NVarChar, updateObj[index]);
                sql += index + "=@" + index + ",";
            }
        }
    }
    sql = sql.substring(0, sql.length - 1) + " WHERE ";
    if (whereObj) {
        for (var index in whereObj) {
            if (typeof whereObj[index] == "number") {
                request.input(index, mssql.Int, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            } else if (typeof whereObj[index] == "string") {
                request.input(index, mssql.NVarChar, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            }
        }
    }
    sql = sql.substring(0, sql.length - 5);
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

var remove = async function (tableName, whereObj) {//更新数据
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    var sql = "DELETE FROM " + tableName;
    sql += " WHERE ";
    if (whereObj) {
        for (var index in whereObj) {
            if (typeof whereObj[index] == "number") {
                request.input(index, mssql.Int, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            } else if (typeof whereObj[index] == "string") {
                request.input(index, mssql.NVarChar, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            }
        }
    }
    sql = sql.substring(0, sql.length - 5);
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

exports.query = query;
exports.find = find;
exports.update = update;
exports.add = add;
exports.save = save;
exports.remove = remove;
exports.batch_add = batch_add;
