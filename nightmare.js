/**
 * Created by sxy on 2017/8/2.
 */
const path = require('path');
var Nightmare = require('nightmare');
var fs=require('fs');
var schedule=require('node-schedule');
var async=require('async');
var mysql=require('mysql');
var db=mysql.createConnection({
    host:        '127.0.0.1',      //数据库地址
    port:         3306,            //数据库端口
    database:     'pear',        //数据库名称
    user:         'root',          //用户名称
    password:     'zj7123181993'   //密码
});

var url=fs.readFileSync('./data/url.txt','utf-8');
var urlList=url.split(",");

var nightmare = Nightmare({
    show: true,
    pollInterval: 300
});
function scheduleStyle(){
    var counter=1;
    //var startTime=new Date(Date.now()+5000);
    //var endTime=new Date(startTime.getTime()+100000);
   schedule.scheduleJob('30 46 * * * *',function () {//设置开始时间与结束时间，表示每小时49分50秒的时候会执行
        console.time("Array initialize");
        urlList.reduce(function(accumulator,url){
            return accumulator.then(function (results) {
                return   nightmare
                    .goto(url)
                    .inject('js', 'jquery-3.2.1.min.js')
                    .wait(function() {
                        var endload=document.querySelector('a#listLoadMore.end');
                        if (endload!==null) return true;
                        document.querySelector("a#listLoadMore").click();//模拟点击事件
                        return false;
                    })
                    .evaluate(function() {
                        var newsList = [];
                        var category=$('.popular-bd').find('.swiper-slide.on').text();
                        var time=Date.now();
                        $('.popularem').each(function() {
                            var $me = $(this);
                            var title = $me.find('.popularem-ath').find('a').find('h2').text();
                            var url = $me.find('.popularem-ath').find('a').attr('href');
                            var img1=$me.find('.popularem-img').attr('style');
                            var img=img1.substring(22,img1.length-2);
                            var duration=$me.find('.cm-duration').text();
                            var content=$me.find('.popularem-ath').find('a').find('p').text();
                            var fav=$me.find('.fav').text().replace(/万/,"0000").replace(/\./,"");
                            var item = {
                                title: title,
                                url: 'http://www.pearvideo.com/'+url,
                                duration:duration,
                                 content:content,
                                img:img,
                                 fav:fav,
                                category:category,
                                time:time
                            };
                            newsList.push(item);
                        });
                        return newsList;
                    })
                    .then(function(result) {
                        results.push(result);
                        return results;
                    });

            })


        },Promise.resolve([])).then(function (results) {

            var item=[];
            for(i=0;i<results.length;i++){
                for(j=0;j<results[i].length;j++){
                    item.push(results[i][j]);

                }
            }
           var  result=unique(item);
            //console.log(result);//打印爬取数据
            console.log(result[0]);//打印数据长度

            console.timeEnd("Array initialize");//打印运行时间
            console.log('定时器触发次数：'+counter);
            counter++;
            saveList(result,function (err) {
              if(err){
                  console.log(err);
              }else {
                  console.log('finished');
              }
            });
            // if(end){
            //     end();//结束，跳出循环
            // }
        });
   });
}


// function end(){
//     nightmare.end().then(function(res){
//         console.log('nightmare end!');
//         //可以做一些日志静态化记录
//     });
// }

function unique(array){//去重，去除数组中重复的部分
    var reArr = [];
    var result=[];
    for(var i = 0; i < array.length; i++){
        if (reArr.indexOf(array[i].url) == -1){//判断元素是否在数组中已经存在,indexOf:判断元素第一次出现的位置
            reArr.push(array[i].url);
            result.push(array[i]);
        }
    }
    return result;
}
function saveList(list,callback) {//保存爬取的数据
    async.eachSeries(list, function (item, next) {
        // 查询分类是否已存在
        db.query('SELECT * FROM `pear_hot` WHERE `url`=? ', [item.url], function (err, data) {
            if (err) return next(err);

          //  if (Array.isArray(data) && data.length >= 1) {
                // 分类已存在，更新一下
               // db.query('UPDATE `pear_hot` SET `title`=?, `fav`=?, `content`=?, `duration`=?, `img`=? ,`category`=?,`time`=? WHERE `url`=?', [item.title,item.fav,item.content,item.duration,item.img,item.category,item.time,item.url], next);
          //  } else {
                // 分类不存在，添加
                db.query('INSERT INTO `pear_hot`( `title`, `url`, `fav`, `content`,`duration`,`img`,`category`,`time`) VALUES (?, ?, ?, ?, ?, ?,?,?)', [item.title, item.url,item.fav,item.content,item.duration,item.img,item.category,item.time], next);
          //  }
        });
      //  db.query('UPDATE `pear_hot` SET `@rank`=0 ,`preScore`=0 , (SELECT `url`,( IF( `@preScore`<>`fav`,`@rank`=`@rank`+1,`@rank` ) ) `rankNum`,`@preScore`=`fav` FROM `pear_hot` ORDER  BY `fav` DESC) `temp_tb_rank` SET `pear_hot.rankNum`=`temp_tb_rank.rankNum` WHERE `pear_hot.url`=`temp_tb_rank.url`')

 
    }, callback);
}
// function compare(propertyName) {
//     return function (object1,object2) {
//         var value1=object1[propertyName];
//         var value2=object2[propertyName];
//         return value2-value1;
//     }
// }
scheduleStyle();



