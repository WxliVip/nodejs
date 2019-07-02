var db = require('./../utils/db') 

const LAST_LIMIT_SENTIMENT = 0.3; //最后一个回复情绪值限制
const AVG_LIMIT_SENTIMENT = 0.5;  //平均回复情绪值限制
const SYNC_TIME = 10 * 3600;      //以秒为单位
/**
 * 获取每个贴子平均情绪值
 */
var get_ticket_avg_sentiment = async function () {
    return await db.query("select ticketid,avg(sentiment) from ticketdetail group by ticketid")
}

/**
 * 获取每个贴子的最后一次回复的情绪值
 */
var get_ticket_last_sentiment = async function () {
    return await db.query("select td.ticketid,td.sentiment from ticketdetail td inner join (select ticketid,max(createtime) from ticketdetail group by ticketid)t on td.ticketid = t.ticketid ")
}

/**
 *  获取需要同步的TicketID
 */
var get_sync_ticketids = function () {
    let ticketids = []
    let ticket_avg = get_ticket_avg_sentiment()
    let ticket_last = get_ticket_last_sentiment()
    ticket_avg.forEach(item => {
        if(item.sentiment < AVG_LIMIT_SENTIMENT) {
            ticketids.push(item.id)
        }
    });
    ticket_last.forEach(item => {
        if(item.sentiment < LAST_LIMIT_SENTIMENT) {
            ticketids.push(item.id)
        }
    });
    return ticketids
}

/**
 *  更新JOB的执行配置
 *  config 属性：
 *      time:     JOB执行间隔
 *      flush:    是否立即执行情绪分析
 *      lasttime: 最后执行的时间
 */
var save_config_db = function (ticketids) {
    ticketids.forEach(id=>{
        await db.update('ticketconfig',{ticketid:id, time: SYNC_TIME, flush:true, lasttime:now()})
    })
}

var execute = function () {
    let tikcetids = get_sync_ticketids();
    save_config_db(tikcetids)
}

exports.execute = execute

