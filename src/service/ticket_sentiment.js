
var db = require('./../utils/db') 
var sentiment = require('./../utils/sentiment') 

/**
 * 执行文本分析
 */
var execute = function() {
    // 1.获取待分析文本
    var contents = get_contents();
    // 2.调用API得到情绪值，回调结果
    sentiment.get_sentiments(contents, (data)=>{
        // 3. 合并结果
        merge_result(contents, data);
        // 4. 更新数据库
        save_sentiments_db(contents)
    })
    
}

/**
 * 从数据库中获取贴子明细列表
 */
var get_contents = async function() {
    return await db.find("ticketdetail")
}

/**
 *  合并情绪分析值
 */
var merge_result = function(contents, result) {
    contents.forEach(item=>{
        let el = result.find(item => item.id == item.id);
        if(el) {
            item["sentiment"] = el["score"]
        }
    })
}

/**
 *  更新DB
 */
var save_sentiments_db = function(contents) {
    contents.forEach(item => {
        var updateObj = { sentiment: item.sentiment }
        var whereObj = { id: item.id }
        db.update("ticketdetail", updateObj, whereObj);
    });
}

exports.execute = execute;