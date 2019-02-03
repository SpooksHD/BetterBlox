/*
    Author: Spooks_HD (@Spooksletsky on twitter)
    Last Update: I'm not going to bother updating this, just look at the git
    Note: Hello random person who is looking at this code, welcome to Hell :)
*/
var print=console.log;
let country

chrome.storage.sync.get('countryDataNew', function(data) {
    country = data.countryDataNew
    if(country==undefined){
        $.get("https://public.spookshd.com:8001/geo/get",res=>{
            if(res && typeof res.result == "object"){
                res=res.result
                country=res
                chrome.storage.sync.set({ countryDataNew: res })
            }
        })
    }
});

function tzc(offset){
   let d=new Date()
   return new Date((d.getTime()+(d.getTimezoneOffset()*60000))+(3600000*offset))
}

let formatter,currencyInfo
let language=navigator.languages?navigator.languages[0]:(navigator.language || navigator.userLanguage)
function convertCurrency(robux){
    if(!formatter && country){
        formatter=new Intl.NumberFormat(language,{
            style: 'currency',
            currency: country.conversion[1].currency,
            minimumFractionDigits: 2
        })
    }

    let usd=robux*0.0035
    let localCurrency=usd*country.conversion[0]
    return formatter.format(localCurrency)
}

function group_admin(){
    var el = document.createElement('script'); //REALLY DIRTY HACK TO GET PRIVATE GROUP ID
    el.innerHTML = `
        var o = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(){
            let a=arguments[1];
            if(a.match(/line-items/)){
                $('li[data-content-class="line-item"]').attr('apigid',a.match(/\\d+/)[0]);
            }
            return o.apply(this, arguments);
        };
    `;
    document.body.appendChild(el);

    Date.prototype.getWeek=function() {
      var firstWeekday=new Date(this.getFullYear(),this.getMonth(),1).getDay();
      var offsetDate=this.getDate()+firstWeekday-1;
      return Math.floor(offsetDate/7);
    }

    $('body').ready(function(){
        let fgid=document.URL.match(/\d+/)[0];

        let savedData;
        let gotData;
        chrome.storage.sync.get(fgid, function(data) {
            savedData = data[fgid];
            gotData=true;
        });

        function ready(gid){
            let parent=$('#revenue');
            let cloner=parent.find('ul');
            let object=cloner.clone();
            let searchObject=object.clone();
            searchObject.addClass('revenueHolder');
            let userObject=object.clone();
            userObject.addClass('revenueHolder');
            object.addClass('revenueHolder');
            let userHolder=$(`
                <div class="userHolder" style="display:block">
                    <table class="table" cellpadding="0" callspacing="0" border="0">
                        <thead>
                            <tr class="table-header">
                                <th class="first date">Date</th>
                                <th class="avatar">Username</th>
                                <th class="description">Item Purchased</th>
                                <th class="amount">Robux Worth</th>
                                <th class="ccgame">Game</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
            `)
            let usersInHolder={}

            //Prepare object
            userObject.empty();
            searchObject.empty();
            object.empty();

            //Go ahead and generate widgets
            let searchbar=$('<input class="revenueSearch" type="text" placeholder="Filter Game Income"></input>')
            let userSearch=$('<input class="userSearch" type="text" placeholder="Type username here to find results"></input>')
            let day=$('<li class="revenueItem"><h2>Today</h2><p>Loading..</p></li>');
            let week=$('<li class="revenueItem"><h2>This Week</h2><p>Loading..</p></li>');
            let month=$('<li class="revenueItem"><h2>This Month</h2><p>Loading..</p></li>');
            let year=$('<li class="revenueItem"><h2>This Year</h2><p>Loading..</p></li>');
            let allTime=$('<li class="revenueItem"><h2>All Time</h2><p>Loading..</p></li>');
            let localCurrencySetting=$(`
                <div class="col-xs-12 section-content game-main-content follow-button-enabled" style="
                    padding: 0;
                    margin-top: 5px;
                    margin-bottom: 15px;
                    margin: 0;
                    min-height: 25px;
                    height: 30px;
                    margin-bottom: 15px;
                    background-color: #fff;
                    position: relative;
                    z-index: 1000;
                ">
                    <span id="rev-toggle" class="btn-toggle receiver-destination-type-toggle" ng-click="toggleAccountPinEnabledSetting()" ng-class="{'on':accountPinContent.isEnabled}" style="
                        transform: translate(-100%,-50%);
                        top: 50%;
                        position: absolute;
                        left: 99.5%;
                        height: 20px !important;
                    ">
                        <span class="toggle-flip" style="
                            box-sizing: inherit;
                        "></span>
                        <span id="toggle-on" class="toggle-on"></span>
                        <span id="toggle-off" class="toggle-off" style="
                            box-sizing: inherit;
                        "></span>
                    </span>
                    <div class="btn-toggle-label ng-binding" ng-show="accountPinContent.isEnabled" ng-bind="'Label.AccountPinEnabled'|translate" style="
                        text-align: right;
                        transform: translate(-100%,-50%);
                        top: 50%;
                        position: absolute;
                        left: 92.5%;
                        height: 95%;
                        width: 25%;
                    ">
                        Robux to Local Currency
                    </div>
                </div>
            `)

            let settingEnabled
            localCurrencySetting.find('#rev-toggle').click(function(){
                settingEnabled=!settingEnabled
                if(settingEnabled){
                    $(this).addClass('on')
                }else{
                    $(this).removeClass('on')
                }
            })
            localCurrencySetting.find('#rev-toggle').hover(function(){
                $(this).css('cusor','pointer')
            },function(){
                $(this).css('cusor','auto')
            })

            //Get information for widgets
            let historyCount=0;
            let transactions=[];

            function g(){
                try{
                    $.get("https://www.roblox.com/currency/line-items/"+gid+"/"+historyCount,{},function(data,tS){
                        if(!data.match('No records found.')){
                            let dataObject=$(data);

                            //Remove all profile images
                            dataObject.find('.roblox-avatar-image').remove();

                            //Loop through and add to transactions
                            dataObject.each(function(){
                                if($(this).is('tr')){
                                    let game=$(this).find('.description').text().match(/for .+/);
                                    let game2=$(this).find('.description').text().match(/at .+/);
                                    let mdate=$(this).find('.date').text().trim().match(/\d+/g);
                                    let userName=$(this).find('.avatar').find('span').text().trim()
                                    if(!mdate){return}
                                    let month=mdate[0];
                                    let day=mdate[1];
                                    let year=mdate[2];
                                    let date=new Date('20'+year,month-1,day);
                                    transactions.push({
                                        date: $(this).find('.date').text().trim(),
                                        month: date.getMonth(),
                                        day: date.getDate(),
                                        week: date.getWeek(),
                                        year: date.getFullYear(),
                                        desc: $(this).find('.description').text().replace('Sold','').trim(),
                                        amount: $(this).find('.amount').text().trim(),
                                        game: game?game[0].trim():game2?game2[0].trim():undefined,
                                        username: userName,
                                    });
                                }
                            })

                            //Add to history count
                            historyCount+=20;

                            //Go ahead and call the function again
                            g();
                        }
                    })
                }catch(err){
                    console.warn("Error: "+err)
                    setTimeout(function(){
                        g()
                    },1500)
                }
            }
            g();

            //Set widgets
            setInterval(function(){
                let today=tzc(-6); //Convert current date to CST since all html endpoints return dates in CST
                let robuxMadeToday=0,robuxMadeThisWeek=0,robuxMadeThisMonth=0,robuxMadeThisYear=0,robuxMadeAllTime=0;
                let last;
                let todayWeek=today.getWeek();
                let todayMonth=today.getMonth();
                let todayDay=today.getDate();
                let todayYear=today.getFullYear();
                for(let t=0; t<transactions.length; t++){
                    let a=transactions[t];
                    if(a.date==""){continue;}
                    if(a.game && searchbar.val()!="" && !a.game.toLowerCase().match(searchbar.val().toLowerCase())){
                        let idKey=a.game+a.username+t
                        if(usersInHolder[idKey]){
                            usersInHolder[idKey].remove()
                            delete usersInHolder[idKey]
                        }
                        continue;
                    }
                    let idKey=a.game+a.username+t
                    if(a.game && userSearch.val()!="" && a.username.toLowerCase().match(userSearch.val().toLowerCase())){
                        let currencyTextToAdd=settingEnabled?convertCurrency(a.amount)+" "+country.conversion[1].currency:a.amount+" Robux"
                        if(!usersInHolder[idKey]){
                            let gameName
                            if(a.game.match('at place')){
                                let start=a.game.indexOf('at place')
                                gameName=a.game.substring(start+'at place'.length+1,a.game.length)
                            }else if(a.game.match('for ')){
                                let start=a.game.indexOf('for ')
                                gameName=a.game.substring(start+'for '.length,a.game.length)
                            }
                            usersInHolder[idKey]=$(`
                                <tr>
                                    <td class="date">`+(Number(a.month)<=9?"0"+(Number(a.month)+1):Number(a.month)+1)+`/`+a.day+`/`+a.year+`</td>
                                    <td class="avatar">`+a.username+`</td>
                                    <td class="description">`+a.desc+`</td>
                                    <td class="amount">`+currencyTextToAdd+`</td>
                                    <td class="ccgame">`+gameName+`</td>
                                </tr>
                            `)
                            userHolder.find('tbody').prepend(usersInHolder[idKey])
                        }else{
                            usersInHolder[idKey].find(".amount").text(currencyTextToAdd)
                        }
                    }else{
                        if(usersInHolder[idKey]){
                            usersInHolder[idKey].remove()
                            delete usersInHolder[idKey]
                        }
                    }

                    //let delta=today.getTime()-date.getTime();
                    //delta=Math.abs(delta/1000);
                    if(a.day==todayDay && a.month==todayMonth && a.year==todayYear){//delta<=86400
                        robuxMadeToday+=parseInt(a.amount,10);
                    }
                    if(a.week==todayWeek && a.month==todayMonth && a.year==todayYear){//delta<=604800){
                        robuxMadeThisWeek+=parseInt(a.amount,10);
                    }
                    if(a.month==todayMonth && a.year==todayYear){//delta<=2.628e+6){
                        robuxMadeThisMonth+=parseInt(a.amount,10);
                    }
                    if(a.year==todayYear){
                        robuxMadeThisYear+=parseInt(a.amount,10)
                    }

                    robuxMadeAllTime+=parseInt(a.amount,10)
                }
                let usersInHolderAmount=0
                for(let a in usersInHolder){
                    if(usersInHolder[a]){
                        usersInHolderAmount++
                    }
                }
                if(usersInHolderAmount===0){
                    userHolder.css('display','none')
                }else{
                    userHolder.css('display','block')
                }
                if(settingEnabled){
                    day.find('p').text(convertCurrency(Math.round(robuxMadeToday*0.7))+" "+country.conversion[1].currency);
                    week.find('p').text(convertCurrency(Math.round(robuxMadeThisWeek*0.7))+" "+country.conversion[1].currency);
                    month.find('p').text(convertCurrency(Math.round(robuxMadeThisMonth*0.7))+" "+country.conversion[1].currency);
                    year.find('p').text(convertCurrency(Math.round(robuxMadeThisYear*0.7))+" "+country.conversion[1].currency);
                    allTime.find('p').text(convertCurrency(Math.round(robuxMadeAllTime*0.7))+" "+country.conversion[1].currency);
                }else{
                    day.find('p').text('$R '+Math.round(robuxMadeToday*0.7).toLocaleString());
                    week.find('p').text('$R '+Math.round(robuxMadeThisWeek*0.7).toLocaleString());
                    month.find('p').text('$R '+Math.round(robuxMadeThisMonth*0.7).toLocaleString());
                    year.find('p').text('$R '+Math.round(robuxMadeThisYear*0.7).toLocaleString());
                    allTime.find('p').text('$R '+Math.round(robuxMadeAllTime*0.7).toLocaleString());
                }
            },250);

            //Parent widgets
            userSearch.appendTo(userObject)
            searchbar.appendTo(searchObject);

            day.appendTo(object);
            week.appendTo(object);
            month.appendTo(object);
            year.appendTo(object)
            allTime.appendTo(object)

            parent.prepend(userHolder)
            parent.prepend(userObject)
            parent.prepend(searchObject)
            parent.prepend(object)
            parent.prepend(localCurrencySetting)
        }
        let timee;
        let clicked;
        timee=setInterval(function(){
            if(gotData && !savedData){
                if(!clicked){
                    $('li[data-content-class="line-item"]').click();
                    clicked=true;
                }
                if($('li[apigid]')){
                    clearInterval(timee);
                    let v=$('li[apigid]').attr('apigid');
                    //console.log(v);
                    chrome.storage.sync.set({[fgid]: v});
                    ready(v);
                }
            }else if(gotData && savedData){
                clearInterval(timee);
                ready(savedData);
            }
        },50)
    })
}

function metaScoreForSmallGameThumbs(){
    $('body').ready(function(){
        new Promise((resolve,reject)=>{
            chrome.storage.sync.get('metaEnabled', data=>{
                let mE = data.metaEnabled;
                if(mE==undefined){
                    chrome.storage.sync.set({ metaEnabled: false });
                    mE=false
                }
                resolve(mE)
            });
        }).then(res=>{
            if(true){
                let filtered={}
                setInterval(function(){
                    $('.game-card-link').each(function(index,value){
                        if($(this).find('.game-name-title') && !$(this).attr('uuid')){
                            let parent=$(this)

                            let idFilter=[
                                {
                                    f: /\/refer\?SortFilter=1/,
                                    p: 4,
                                },
                                {
                                    f: /\/refer\?Rec/,
                                    p: 2,
                                },
                                {
                                    f: /\/refer\?SortFilter=5/,
                                    p: 1,
                                },
                                {
                                    f: /\d+/,
                                    p: 0,
                                },
                            ]

                            let id

                            for(let a of idFilter){
                                let mat=$(this).attr('href').match(a.f)
                                if(mat!=undefined){
                                    mat=$(this).attr('href').match(/\d+/g)
                                    //console.log(mat)
                                    id=mat[a.p]
                                    break
                                }
                            }

                            //console.log(id)
                            let ext='metaScoreD2'
                            let uid=uuid()
                            $(this).attr('uuid',uid)
                            $(this).attr('placeid',id)
                            new Promise((resolve,reject)=>{
                                $.post('https://public.spookshd.com:8003/metacritic/get/score',{id:Number(id)},res=>{
                                    resolve(res.result)
                                })
                            }).then(res=>{
                                let div=$('<div class="scoreContainer"><div class="miniScore metaScore">'+(res!=undefined?res:"--")+'</div></div>')
                                if(res==undefined){
                                    div.find('.metaScore').addClass('noResults')
                                }else if(res<=40){
                                    div.find('.metaScore').addClass('badScore')
                                }else if(res<=75){
                                    div.find('.metaScore').addClass('okScore')
                                }
                                div.prependTo(parent)

                                filtered[uid]=Date.now()
                            })
                        }else if($(this).attr('uuid') && filtered[$(this).attr('uuid')]){
                            let last=filtered[$(this).attr('uuid')]
                            let id=$(this).attr('placeid')
                            let parent=$(this)
                            if((Date.now()-last)/1000>=30){
                                filtered[$(this).attr('uuid')]=Date.now()
                                new Promise((resolve,reject)=>{
                                    $.post('https://public.spookshd.com:8003/metacritic/get/score',{id:Number(id)},res=>{
                                        resolve(res.result)
                                    })
                                }).then(res=>{
                                    if(!parent.find('.metaScore')[0]){
                                        $('<div class="scoreContainer"><div class="miniScore metaScore">'+(res!=undefined?res:"--")+'</div></div>').prependTo(parent.find('a'))
                                    }

                                    parent.find('.metaScore').text(res!=undefined?res:"--")
                                    parent.find('.metaScore').removeClass('noResults')
                                    parent.find('.metaScore').removeClass('badScore')
                                    parent.find('.metaScore').removeClass('okScore')
                                    if(res==undefined){
                                        parent.find('.metaScore').addClass('noResults')
                                    }else if(res<=40){
                                        parent.find('.metaScore').addClass('badScore')
                                    }else if(res<=75){
                                        parent.find('.metaScore').addClass('okScore')
                                    }
                                    filtered[parent.attr('uuid')]=Date.now()
                                })
                            }
                        }
                    })
                },250)
            }
        })
    })
}

function criticGamePage(){
    $('body').ready(function(){
        new Promise((resolve,reject)=>{
            chrome.storage.sync.get('metaEnabled', data=>{
                let mE = data.metaEnabled;
                if(mE==undefined){
                    chrome.storage.sync.set({ metaEnabled: false });
                    mE=false
                }
                resolve(mE)
            });
        }).then(res=>{
            if(true){
                let filtered={}
                let div
                let id=document.location.href.match(/\d+/)[0]
                //console.log(id)

                $('.nav-tabs').children().each(function(){
                    $(this).addClass('rbx-tab-modified')
                })

                let reviewTab=$('#tab-game-instances').clone()
                reviewTab.prop('id','tab-reviews')
                reviewTab.find('span').text("Reviews")
                reviewTab.find('a').attr('href','#!/reviews')
                reviewTab.appendTo($('.nav-tabs'))

                //Create tab-pane
                let pane=$('#about').clone()
                pane.empty()
                pane.prop('id','reviews')
                pane.removeClass('active')

                //Add review stats section
                let reviewStats=$(`
                    <div class="section game-about-container">
                        <div class="section-content remove-panel border-bottom" id="criticStats" style="
                            display: flex;
                            margin-bottom: 0px;
                            ">
                            <div id="critic" style="
                                height: 200px;
                                width: 175px;
                                display: inline-block;
                                display: inline-block;
                                margin-left: auto;
                                margin-right: 5px;
                                ">
                                <div style="
                                    display: flex;
                                    padding-bottom: 10px;
                                    ">
                                    <div id="criticScore" style="
                                        width: 3em;
                                        height: 3em;
                                        margin-left: auto;
                                        margin-right: auto;
                                        text-align: center;
                                        line-height: 3em;
                                        color: rgb(255, 255, 255) !important;
                                        font-style: normal !important;
                                        font-weight: bold !important;
                                        white-space: nowrap;
                                        font-family: Arial, Helvetica, sans-serif;
                                        vertical-align: middle;
                                        font-size: 50px;
                                        display: inline-block;
                                        ">85</div>
                                </div>
                                <div id="criticScoreText" style="
                                    display: inline-block;
                                    color: black;
                                    text-align: center;
                                    width: 100%;
                                    font-weight: bold;
                                    ">Overwhelmingly Positive</div>
                                <div style="
                                    display: inline-block;
                                    color: black;
                                    text-align: center;
                                    width: 100%;
                                    font-weight: bold;
                                    "><span id="criticScoreAmount" style="
                                    color: #00A2FF;
                                    ">500</span> Critic Reviews</div>
                            </div>
                            <div id="uesr" style="
                                height: 200px;
                                width: 175px;
                                display: inline-block;
                                display: inline-block;
                                margin-right: auto;
                                margin-left: 5px;
                                ">
                                <div style="
                                    display: flex;
                                    padding-bottom: 10px;
                                    ">
                                    <div id="userScore" style="
                                        width: 3em;
                                        height: 3em;
                                        margin-left: auto;
                                        margin-right: auto;
                                        text-align: center;
                                        line-height: 3em;
                                        color: rgb(255, 255, 255) !important;
                                        font-style: normal !important;
                                        font-weight: bold !important;
                                        white-space: nowrap;
                                        font-family: Arial, Helvetica, sans-serif;
                                        vertical-align: middle;
                                        font-size: 50px;
                                        display: inline-block;
                                        border-radius: 100%;
                                        ">85</div>
                                </div>
                                <div id="userScoreText" style="
                                    display: inline-block;
                                    color: black;
                                    text-align: center;
                                    width: 100%;
                                    font-weight: bold;
                                    ">Overwhelmingly Positive</div>
                                <div style="
                                    display: inline-block;
                                    color: black;
                                    text-align: center;
                                    width: 100%;
                                    font-weight: bold;
                                    "><span id="userScoreAmount" style="
                                    color: #00A2FF;
                                    ">500</span> User Reviews</div>
                            </div>
                        </div>
                    </div>
                `)
                let reviewSection=$(`
                    <div class="section-content remove-panel border-bottom" id="reviews" style="
                        display: flex;
                        margin-bottom: 0px;
                        ">
                        <div id="criticReviewSection" style="
                            width: 48%;
                            margin-right: 1.5%;
                            ">
                            <div class="container-header">
                                <h3>Critic Reviews</h3>
                            </div>
                        </div>
                        <div id="userReviewSection" style="
                            width: 48%;
                            margin-left: 1.5%;
                            ">
                            <div class="container-header">
                                <h3>User Reviews</h3>
                            </div>
                        </div>
                    </div>
                `)
                let reviews={}

                let reviewCenter,editCenter

                reviewStats.prependTo(pane)
                reviewSection.appendTo(pane)

                pane.appendTo($('.rbx-tab-content'))

                reviewTab.click(function(){
                    if(!reviewTab.hasClass('active')){
                        $('.nav-tabs').children().each(function(){
                            $(this).removeClass('active')
                        })

                        $('.rbx-tab-content').children().each(function(){
                            $(this).removeClass('active')
                        })

                        pane.addClass('active')
                        reviewTab.addClass('active')
                    }
                })

                if(document.location.href.match('#!/reviews')){
                    if(!reviewTab.hasClass('active')){
                        $('.nav-tabs').children().each(function(){
                            $(this).removeClass('active')
                        })

                        $('.rbx-tab-content').children().each(function(){
                            $(this).removeClass('active')
                        })

                        pane.addClass('active')
                        reviewTab.addClass('active')
                    }
                }

                function getScoreLabel(score,reviews){
                    let requiredForSpecialCase=25
                    if(score>=95 && reviews>=requiredForSpecialCase){
                        return "Overwhelmingly Positive"
                    }else if(score>=80 && reviews>=requiredForSpecialCase){
                        return "Very Positive"
                    }else if(score>=80 && reviews<requiredForSpecialCase){
                        return "Positive"
                    }else if(score>=70){
                        return "Mostly Positive"
                    }else if(score>=40){
                        return "Mixed"
                    }else if(score>=20  && reviews>=requiredForSpecialCase){
                        return "Mostly Negative"
                    }else if(score>=20 && reviews<requiredForSpecialCase){
                        return "Negative"
                    }else if(score>=0 && reviews<requiredForSpecialCase){
                        return "Mostly Negative"
                    }else if(score>=0){
                        return "Overwhelmingly Negative"
                    }
                }

                let savedUserId
                let voteObject
                let ourData
                let currentlyEditing
                function update(){
                    new Promise((resolve,reject)=>{
                        $.post('https://public.spookshd.com:8003/metacritic/get/score',{id:Number(id)},res=>{
                            //console.log(res)
                            resolve(res.result)
                        })
                    }).then(res=>{
                        if(!div){
                            div=$('<div class="scoreContainer"><div class="metaScore">'+(res!=undefined?res:"--")+'</div></div>')
                            div.prependTo($('#carousel-game-details'))
                        }

                        div.find('.metaScore').text(res!=undefined?res:"--")
                        div.find('.metaScore').removeClass('noResults')
                        div.find('.metaScore').removeClass('badScore')
                        div.find('.metaScore').removeClass('okScore')
                        if(res==undefined){
                            div.find('.metaScore').addClass('noResults')
                        }else if(Number(res)<=40){
                            div.find('.metaScore').addClass('badScore')
                        }else if(Number(res)<=75){
                            div.find('.metaScore').addClass('okScore')
                        }
                    })

                    new Promise((resolve,reject)=>{
                        $.post('https://public.spookshd.com:8003/metacritic/get/profile',{id:Number(id)},res=>{
                            if(!savedUserId){
                                let username=$('.age-bracket-label-username').text().replace(": ","")
                                $.get('https://api.roblox.com/users/get-by-username?username='+username,res2=>{
                                    savedUserId=res2.Id
                                    resolve(res.result)
                                })
                            }else{
                                resolve(res.result)
                            }
                        })
                    }).then(res=>{
                        $('#criticScoreText').text((res!=undefined && res.criticScore!=undefined)?getScoreLabel(res.criticScore,res.criticReviews.length):"No Results")
                        $('#userScoreText').text((res!=undefined && res.userScore!=undefined)?getScoreLabel(res.userScore,res.userReviews.length):"No Results")
                        $('#criticScoreAmount').text((res!=undefined && res.criticScore!=undefined)?res.criticReviews.length:0)
                        $('#userScoreAmount').text((res!=undefined && res.userScore!=undefined)?res.userReviews.length:0)
                        $('#criticScore').text((res!=undefined && res.criticScore!=undefined)?res.criticScore:"--")
                        $('#userScore').text((res!=undefined && res.userScore!=undefined)?res.userScore:"--")
                        for(let a of ['noResults','badScore','okScore','greatScore']){
                            $('#criticScore').removeClass(a)
                            $('#userScore').removeClass(a)
                        }

                        if(res==undefined){
                            //Do some defaults
                            $('#criticScore').addClass('noResults')
                            $('#userScore').addClass('noResults')
                        }else{
                            if(res.userScore!=undefined){
                                for(let a of [{c:'badScore',a:40},{c:'okScore',a:75},{c:'greatScore',a:100}]){
                                    if(res.userScore<=a.a){
                                        $('#userScore').addClass(a.c)
                                        break
                                    }
                                }
                            }else{
                                $('#userScore').addClass('noResults')
                            }
                            if(res.criticScore!=undefined){
                                for(let a of [{c:'badScore',a:40},{c:'okScore',a:75},{c:'greatScore',a:100}]){
                                    if(res.criticScore<=a.a){
                                        $('#criticScore').addClass(a.c)
                                        break
                                    }
                                }
                            }else{
                                $('#criticScore').addClass('noResults')
                            }
                        }

                        //Do some check
                        let canWriteAReview=true
                        if(res!=undefined){
                            if(res.criticReviews){
                                for(let t=0; t<res.criticReviews.length; t++){
                                    if(res.criticReviews[t].userid==savedUserId){
                                        canWriteAReview=false
                                        break
                                    }
                                }
                            }
                            if(res.userReviews){
                                for(let t=0; t<res.userReviews.length; t++){
                                    if(res.userReviews[t].userid==savedUserId){
                                        canWriteAReview=false
                                        break
                                    }
                                }
                            }
                        }
                        if(canWriteAReview){
                            if(!reviewCenter){
                                reviewCenter=$(`
                                    <div class="section-content remove-panel border-bottom" id="reviewCenter" style="
                                        display: block;
                                        margin-bottom: 0px;
                                        ">
                                        <div class="container-header">
                                            <h3>Write A Review</h3>
                                        </div>
                                        <div style="
                                            display: block;
                                            float: right;
                                            color: rgb(255, 167, 0);
                                            font-size: 18px;
                                            font-weight: bold;
                                            display: none;
                                        " id="error">There was an error</div>
                                        <div class="form-group"><textarea id="reviewData" class="form-control input-field ng-pristine ng-valid ng-empty ng-valid-maxlength ng-touched" maxlength="1000" placeholder="Think of something that might point out the good/bad aspects of a game..." style="
                                            height: 82px;
                                            resize: none;
                                            "></textarea></div>
                                        <button id="postButton" class="btn-secondary-md group-form-button ng-binding" style="
                                            float: right;
                                            " disabled="disabled">Post Review</button>
                                        <div style="
                                            display: flex;
                                            float: right;
                                            width: 115px;
                                            height: auto;
                                            padding: 9px 9px;
                                            ">
                                            <div class="upvote" style="
                                                display: inline-block;
                                                margin: auto;
                                                ">
                                                <span class="icon-like " id="upvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 74.55%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Upvote</div>
                                                </div>
                                            </div>
                                            <div class="upvote" style="
                                                display: inline-block;
                                                margin: auto;
                                                ">
                                                <span class="icon-mixed selected" id="mixedvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 78.75%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Mixed</div>
                                                </div>
                                            </div>
                                            <div class="downvote" style="
                                                display: inline-block;
                                                margin: auto;
                                                ">
                                                <span class="icon-dislike " id="downvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Downvote</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `)
                                reviewCenter.insertAfter(reviewStats)

                                let option,netInterval,typed
                                reviewCenter.find('#upvote').click(function(){
                                    if(!option){
                                        option=true
                                        $(this).addClass("selected")
                                        reviewCenter.find('#downvote').removeClass("selected")
                                        reviewCenter.find('#mixedvote').removeClass("selected")
                                    }
                                })
                                reviewCenter.find('#mixedvote').click(function(){
                                    if(option!=undefined){
                                        option=undefined
                                        $(this).addClass("selected")
                                        reviewCenter.find('#upvote').removeClass("selected")
                                        reviewCenter.find('#downvote').removeClass("selected")
                                    }
                                })
                                reviewCenter.find('#downvote').click(function(){
                                    if(option==undefined || option){
                                        option=false
                                        $(this).addClass("selected")
                                        reviewCenter.find('#upvote').removeClass("selected")
                                        reviewCenter.find('#mixedvote').removeClass("selected")
                                    }
                                })

                                let tweenInTime=250
                                let tweenOutTime=500
                                reviewCenter.find('#downvote').hover(function(){
                                    $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                },function(){
                                    $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                })
                                reviewCenter.find('#mixedvote').hover(function(){
                                    $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                },function(){
                                    $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                })
                                reviewCenter.find('#upvote').hover(function(){
                                    $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                },function(){
                                    $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                })

                                let focused
                                let buttonErorr
                                reviewCenter.find('textarea').focus(function(){
                                    focused=true
                                })

                                let buttonBusy
                                reviewCenter.find('button').click(function(){
                                    if((reviewCenter.find('textarea').val()=="" || reviewCenter.find('textarea').val().length>=30) && !buttonBusy){
                                        buttonBusy=true
                                        new Promise((resolve,reject)=>{
                                            new Promise((r,r2)=>{
                                                let username=$('.age-bracket-label-username').text().replace(": ","")
                                                $.get('https://api.roblox.com/users/get-by-username?username='+username,res=>{
                                                    //console.log(res)
                                                    r(res)
                                                })
                                            }).then(res=>{
                                                $.post('https://public.spookshd.com:8003/metacritic/post/review',{
                                                    id:Number(id),
                                                    review:reviewCenter.find('textarea').val(),
                                                    vote:option==undefined?"mixed":option?"upvote":"downvote",
                                                    userid:Number(res.Id)
                                                },res=>{
                                                    //console.log(res)
                                                    resolve(res.result)
                                                })
                                            })
                                        }).then(res=>{
                                            //console.log(res)
                                            if(res){
                                                clearInterval(netInterval)
                                                reviewCenter.remove()
                                                update()
                                            }
                                            buttonBusy=false
                                        })
                                    }
                                })

                                netInterval=setInterval(function(){
                                    let textEmpty=reviewCenter.find('textarea').val()==""
                                    let textNotLongEnough=reviewCenter.find('textarea').val().length<30
                                    if(textEmpty || textNotLongEnough){
                                        reviewCenter.find('button').attr("disabled","disabled")
                                    }else if(!textNotLongEnough && !textEmpty){
                                        reviewCenter.find('button').removeAttr("disabled")
                                    }

                                    if(reviewCenter.find('textarea').val().length<30 && focused){
                                        reviewCenter.find('#error').text("30 Characters minimum")
                                        reviewCenter.find('#error').css('display','inline-block')
                                    }else{
                                        reviewCenter.find('#error').css('display','none')
                                    }
                                },50)
                            }
                        }else{
                            if(!editCenter){
                                editCenter=$(`
                                    <div class="section-content remove-panel border-bottom" id="editCenter" style="
                                        display: block;
                                        margin-bottom: 0px;
                                        ">
                                        <div class="container-header">
                                            <h3>Your Review On This Game</h3>
                                        </div>
                                        <div style="
                                            display: block;
                                            float: right;
                                            color: rgb(255, 167, 0);
                                            font-size: 18px;
                                            font-weight: bold;
                                            display: none;
                                        " id="error">There was an error</div>
                                        <div class="form-group"><textarea id="reviewData" class="form-control input-field ng-pristine ng-valid ng-empty ng-valid-maxlength ng-touched" maxlength="1000" placeholder="Think of something that might point out the good/bad aspects of a game..." disabled style="
                                            height: 82px;
                                            resize: none;
                                            "></textarea></div>
                                        <button id="editButton" class="btn-secondary-md group-form-button ng-binding" style="
                                            float: right;
                                            ">Edit Review</button>
                                        <div id="voteHolder" style="
                                            display: inline-block;
                                            float: right;
                                            width: 115px;
                                            height: auto;
                                            padding: 9px 9px;
                                            ">
                                        </div>
                                    </div>
                                `)

                                editCenter.insertAfter(reviewStats)

                                //Change value
                                for(let t=0; t<res.criticReviews.length; t++){
                                    if(res.criticReviews[t].userid==savedUserId){
                                        ourData=res.criticReviews[t]
                                        break
                                    }
                                }
                                if(!ourData){
                                    for(let t=0; t<res.userReviews.length; t++){
                                        if(res.userReviews[t].userid==savedUserId){
                                            ourData=res.userReviews[t]
                                            break
                                        }
                                    }
                                }
                                if(ourData){
                                    editCenter.find('textarea').val(ourData.review)
                                    if(ourData.vote=="upvote"){
                                        voteObject=$(`
                                            <div class="upvote" style="
                                                display: inline-block;
                                                float: right;
                                                ">
                                                <span class="icon-like selected" id="upvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Upvote</div>
                                                </div>
                                            </div>
                                        `)
                                        voteObject.prependTo(editCenter.find('#voteHolder'))
                                    }else if(ourData.vote=="mixed"){
                                        voteObject=$(`
                                            <div class="upvote" style="
                                                display: inline-block;
                                                float: right;
                                                ">
                                                <span class="icon-mixed selected" id="mixedvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Mixed</div>
                                                </div>
                                            </div>
                                        `)
                                        voteObject.prependTo(editCenter.find('#voteHolder'))
                                    }else if(ourData.vote=="downvote"){
                                        voteObject=$(`
                                            <div class="downvote" style="
                                                display: inline-block;
                                                float: right;
                                                ">
                                                <span class="icon-dislike selected" id="downvote"></span>
                                                <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                    <div class="tooltip-arrow" style="left: 50%;"></div>
                                                    <div class="tooltip-inner">Downvote</div>
                                                </div>
                                            </div>
                                        `)
                                        voteObject.prependTo(editCenter.find('#voteHolder'))
                                    }

                                    voteObject.find('span').hover(function(){
                                        $(this).parent().find('div').animate({opacity:1},250)
                                    },function(){
                                        $(this).parent().find('div').animate({opacity:0},500)
                                    })

                                    let editDisabled
                                    editCenter.find('#editButton').click(function(){
                                        //console.log("vhat")
                                        if(editDisabled){return}
                                        currentlyEditing=true
                                        editDisabled=true
                                        editCenter.find('#editButton').attr('disabled',true)
                                        editCenter.find('#editButton').css('display','none')
                                        editCenter.find('#voteHolder').css('display','none')
                                        editCenter.find('textarea').removeAttr('disabled')
                                        editCenter.find('h3').text("Edit Your Review")
                                        let pushButton=$(`
                                            <button id="postButton" class="btn-secondary-md group-form-button ng-binding" style="
                                                float: right;
                                                " disabled>Post Edit</button>
                                        `)
                                        let cancelButton=$(`
                                            <button id="postButton" class="btn-secondary-md group-form-button ng-binding" style="
                                                float: right;
                                                margin-left: 10px;
                                                "">Cancel Edit</button>
                                        `)
                                        let voteContainer=$(`
                                            <div style="
                                                display: flex;
                                                float: right;
                                                width: 115px;
                                                height: auto;
                                                padding: 9px 9px;
                                                ">
                                                <div class="upvote" style="
                                                    display: inline-block;
                                                    margin: auto;
                                                    ">
                                                    <span class="icon-like " id="upvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 65.55%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Upvote</div>
                                                    </div>
                                                </div>
                                                <div class="upvote" style="
                                                    display: inline-block;
                                                    margin: auto;
                                                    ">
                                                    <span class="icon-mixed" id="mixedvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 69.75%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Mixed</div>
                                                    </div>
                                                </div>
                                                <div class="downvote" style="
                                                    display: inline-block;
                                                    margin: auto;
                                                    ">
                                                    <span class="icon-dislike " id="downvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 72%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Downvote</div>
                                                    </div>
                                                </div>
                                            </div>
                                        `)
                                        cancelButton.appendTo(editCenter)
                                        pushButton.appendTo(editCenter)
                                        voteContainer.appendTo(editCenter)

                                        let option,netInterval,typed,quit
                                        if(ourData.vote=="mixed"){
                                            option=undefined
                                            voteContainer.find('#mixedvote').addClass('selected')
                                        }else if(ourData.vote=="upvote"){
                                            option=true
                                            voteContainer.find('#upvote').addClass('selected')
                                        }else{
                                            option=false
                                            voteContainer.find('#downvote').addClass('selected')
                                        }
                                        voteContainer.find('#upvote').click(function(){
                                            if(!option){
                                                option=true
                                                $(this).addClass("selected")
                                                voteContainer.find('#downvote').removeClass("selected")
                                                voteContainer.find('#mixedvote').removeClass("selected")
                                            }
                                        })
                                        voteContainer.find('#mixedvote').click(function(){
                                            if(option!=undefined){
                                                option=undefined
                                                $(this).addClass("selected")
                                                voteContainer.find('#upvote').removeClass("selected")
                                                voteContainer.find('#downvote').removeClass("selected")
                                            }
                                        })
                                        voteContainer.find('#downvote').click(function(){
                                            if(option==undefined || option){
                                                option=false
                                                $(this).addClass("selected")
                                                voteContainer.find('#upvote').removeClass("selected")
                                                voteContainer.find('#mixedvote').removeClass("selected")
                                            }
                                        })

                                        let tweenInTime=250
                                        let tweenOutTime=500
                                        voteContainer.find('#downvote').hover(function(){
                                            $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                        },function(){
                                            $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                        })
                                        voteContainer.find('#mixedvote').hover(function(){
                                            $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                        },function(){
                                            $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                        })
                                        voteContainer.find('#upvote').hover(function(){
                                            $(this).parent().find('div').animate({opacity:1},tweenInTime)
                                        },function(){
                                            $(this).parent().find('div').animate({opacity:0},tweenOutTime)
                                        })

                                        let focused
                                        let buttonErorr
                                        editCenter.find('textarea').focus(function(){
                                            focused=true
                                        })

                                        let buttonBusy
                                        pushButton.click(function(){
                                            let thisVote=option==undefined?"mixed":option?"upvote":"downvote"
                                            let sameReview=ourData.vote==thisVote
                                            let sameText=editCenter.find('textarea').val()==ourData.review
                                            let textEmpty=editCenter.find('textarea').val()==""
                                            let textNotLongEnough=editCenter.find('textarea').val().length<30
                                            if((!sameText || !sameReview) && !textNotLongEnough && !textEmpty && !buttonBusy){
                                                buttonBusy=true
                                                new Promise((resolve,reject)=>{
                                                    new Promise((r,r2)=>{
                                                        let username=$('.age-bracket-label-username').text().replace(": ","")
                                                        $.get('https://api.roblox.com/users/get-by-username?username='+username,res=>{
                                                            //console.log(res)
                                                            r(res)
                                                        })
                                                    }).then(res=>{
                                                        $.post('https://public.spookshd.com:8003/metacritic/post/edit',{
                                                            id:Number(id),
                                                            review:editCenter.find('textarea').val(),
                                                            vote:option==undefined?"mixed":option?"upvote":"downvote",
                                                            userid:Number(res.Id)
                                                        },res=>{
                                                            //console.log(res)
                                                            resolve(res.result)
                                                        })
                                                    })
                                                }).then(res=>{
                                                    if(res){
                                                        //console.log(res)
                                                        quit(true)
                                                        update()
                                                    }
                                                    buttonBusy=false
                                                })
                                            }
                                        })

                                        netInterval=setInterval(function(){
                                            let thisVote=option==undefined?"mixed":option?"upvote":"downvote"
                                            let sameReview=ourData.vote==thisVote
                                            let sameText=editCenter.find('textarea').val()==ourData.review
                                            let textEmpty=editCenter.find('textarea').val()==""
                                            let textNotLongEnough=editCenter.find('textarea').val().length<30
                                            if(textEmpty || textNotLongEnough || (sameText && sameReview)){
                                                pushButton.attr("disabled","disabled")
                                            }else if((!sameText || !sameReview) && !textNotLongEnough && !textEmpty){
                                                pushButton.removeAttr("disabled")
                                            }

                                            if(editCenter.find('textarea').val().length<30 && focused){
                                                editCenter.find('#error').text("30 Characters minimum")
                                                editCenter.find('#error').css('display','inline-block')
                                            }else{
                                                editCenter.find('#error').css('display','none')
                                            }
                                        },50)

                                        cancelButton.click(function(){
                                            quit()
                                        })

                                        quit=(t)=>{
                                            pushButton.remove()
                                            voteContainer.remove()
                                            cancelButton.remove()
                                            editCenter.find('#editButton').removeAttr('disabled')
                                            editCenter.find('#editButton').css('display','inline-block')
                                            editCenter.find('#voteHolder').css('display','inline-block')
                                            editCenter.find('textarea').attr('disabled',true)
                                            if(!t){
                                                editCenter.find('textarea').val(ourData.review)
                                            }
                                            editCenter.find('h3').text("Your Review On This Game")
                                            editDisabled=false
                                            currentlyEditing=false
                                            clearInterval(netInterval)
                                        }
                                    })
                                }
                            }else{
                                let nOD
                                for(let t=0; t<res.criticReviews.length; t++){
                                    if(res.criticReviews[t].userid==savedUserId){
                                        nOD=res.criticReviews[t]
                                        break
                                    }
                                }
                                if(!nOD){
                                    for(let t=0; t<res.userReviews.length; t++){
                                        if(res.userReviews[t].userid==savedUserId){
                                            nOD=res.userReviews[t]
                                            break
                                        }
                                    }
                                }
                                if(nOD){
                                    ourData=nOD
                                    if(!currentlyEditing){
                                        editCenter.find('textarea').val(ourData.review)
                                        if(ourData.vote=="upvote" && (!voteObject || !voteObject.find('#upvote')[0])){
                                            if(voteObject){voteObject.remove()}
                                            voteObject=$(`
                                                <div class="upvote" style="
                                                    display: inline-block;
                                                    float: right;
                                                    ">
                                                    <span class="icon-like selected" id="upvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Upvote</div>
                                                    </div>
                                                </div>
                                            `)
                                            voteObject.prependTo(editCenter.find('#voteHolder'))
                                        }else if(ourData.vote=="mixed"  && (!voteObject || !voteObject.find('#mixedvote')[0])){
                                            if(voteObject){voteObject.remove()}
                                            voteObject=$(`
                                                <div class="upvote" style="
                                                    display: inline-block;
                                                    float: right;
                                                    ">
                                                    <span class="icon-mixed selected" id="mixedvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Mixed</div>
                                                    </div>
                                                </div>
                                            `)
                                            voteObject.prependTo(editCenter.find('#voteHolder'))
                                        }else if(ourData.vote=="downvote" && (!voteObject || !voteObject.find('#downvote')[0])){
                                            if(voteObject){voteObject.remove()}
                                            voteObject=$(`
                                                <div class="downvote" style="
                                                    display: inline-block;
                                                    float: right;
                                                    ">
                                                    <span class="icon-dislike selected" id="downvote"></span>
                                                    <div class="tooltip fade bottom in" role="tooltip" id="tooltip131152" style="left: 81.25%;display: block; opacity:0;">
                                                        <div class="tooltip-arrow" style="left: 50%;"></div>
                                                        <div class="tooltip-inner">Downvote</div>
                                                    </div>
                                                </div>
                                            `)
                                            voteObject.prependTo(editCenter.find('#voteHolder'))
                                        }

                                        voteObject.find('span').hover(function(){
                                            $(this).parent().find('div').animate({opacity:1},250)
                                        },function(){
                                            $(this).parent().find('div').animate({opacity:0},500)
                                        })
                                    }
                                }
                            }
                        }

                        if(res!=undefined){
                            for(let a of res.criticReviews){
                                if(!reviews[a.userid]){
                                    reviews[a.userid]=true //We'll change this later
                                    new Promise((resolve,reject)=>{
                                        $.get('https://api.roblox.com/users/'+a.userid,res=>{
                                            resolve(res)
                                        })
                                    }).then(rese=>{
                                        let reviewObject=$(`
                                            <div class="section-content remove-panel" style="
                                                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
                                                width: 100%;
                                                padding: 15px;
                                                margin-bottom: 5px;
                                                ">
                                                <div style="
                                                    display: flex;
                                                    ">
                                                    <div id="typeHolder" style="
                                                        width: 75px;
                                                        height: 75px;
                                                        background-image: url(&quot;http://chittagongit.com//images/white-thumbs-up-icon/white-thumbs-up-icon-26.jpg&quot;);
                                                        background-size: 70%;
                                                        background-repeat: no-repeat;
                                                        background-position: center;
                                                        display: inline-block;
                                                        "></div>
                                                    <div style="
                                                        margin-left: 15px;
                                                        display: inline-block;
                                                        ">
                                                        <div id="reviewUsername" style="
                                                            font-size: 25px;
                                                            ">`+rese.Username+`</div>
                                                        <div id="published">Review published `+a.posted+`</div>
                                                        <div id="revised" style="display: none;">Revised 02/2/2019</div>
                                                    </div>
                                                </div>
                                                <p style="
                                                    margin-top: 20px;
                                                    "><span style="display: inline;" id="start"></span></p>
                                            </div>
                                        `)

                                        let maxCap=400
                                        if(a.review.length>maxCap){
                                            let nStr=a.review.substr(0,a.review.lastIndexOf(' ', maxCap))
                                            let rest=a.review.substring(nStr.length+1,a.review.length)
                                            reviewObject.find('p').find('#start').text(nStr)
                                            reviewObject.find('p').append($(`
                                                <span id="dots">
                                                    ...
                                                </span>
                                                <span id="more" style="display: none;">
                                                    `+rest+`
                                                </span>
                                            `))
                                            reviewObject.append($(`
                                                <div id="expand">
                                                    Read more
                                                </div>
                                            `))
                                            let expanded
                                            reviewObject.find('#expand').click(function(){
                                                if(expanded){
                                                    reviewObject.find('p').find('#dots').css('display','inline')
                                                    reviewObject.find('p').find('#more').css('display','none')
                                                    $(this).text('Read more')
                                                }else{
                                                    reviewObject.find('p').find('#dots').css('display','none')
                                                    reviewObject.find('p').find('#more').css('display','inline')
                                                    $(this).text('Read less')
                                                }
                                                expanded=!expanded
                                            })
                                        }else{
                                            reviewObject.find('p').text(a.review)
                                        }

                                        if(a.edited){
                                            reviewObject.find("#revised").css('display','inline-block')
                                            reviewObject.find('#revised').text("Revised "+a.edited)
                                        }

                                        if(a.vote=="upvote"){
                                            reviewObject.find('#typeHolder').addClass('greatScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsup.png)")
                                        }else if(a.vote=="mixed"){
                                            reviewObject.find('#typeHolder').addClass('okScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/mixedfull.png)")
                                        }else if(a.vote=="downvote"){
                                            reviewObject.find('#typeHolder').addClass('badScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsdown.png)")
                                        }

                                        reviewObject.appendTo($('#criticReviewSection'))

                                        reviews[a.userid]=reviewObject
                                    })
                                }else if(typeof reviews[a.userid] != "boolean"){
                                    let maxCap=400
                                    if(a.review.length>maxCap){
                                        let nStr=a.review.substr(0,a.review.lastIndexOf(' ', maxCap))
                                        let rest=a.review.substring(nStr.length+1,a.review.length)
                                        reviews[a.userid].find('p').find('#start').text(nStr)
                                        if(reviews[a.userid].find('p').find('#dots')[0]){
                                            reviews[a.userid].find('p').find('#more').text(rest)
                                        }else{
                                            reviews[a.userid].find('p').append($(`
                                                <span id="dots">
                                                    ...
                                                </span>
                                                <span id="more" style="display: none;">
                                                    `+rest+`
                                                </span>
                                            `))
                                            reviews[a.userid].append($(`
                                                <div id="expand">
                                                    Read more
                                                </div>
                                            `))
                                            let expanded
                                            reviews[a.userid].find('#expand').click(function(){
                                                if(expanded){
                                                    reviews[a.userid].find('p').find('#dots').css('display','inline')
                                                    reviews[a.userid].find('p').find('#more').css('display','none')
                                                    $(this).text('Read more')
                                                }else{
                                                    reviews[a.userid].find('p').find('#dots').css('display','none')
                                                    reviews[a.userid].find('p').find('#more').css('display','inline')
                                                    $(this).text('Read less')
                                                }
                                                expanded=!expanded
                                            })
                                        }
                                    }else{
                                        if(reviews[a.userid].find('p').find('#dots')[0]){
                                            reviews[a.userid].find('p').find('#dots').remove()
                                            reviews[a.userid].find('p').find('#more').remove()
                                            reviews[a.userid].find('#expand').remove()
                                        }
                                        reviews[a.userid].find('p').find('#start').text(a.review)
                                    }

                                    for(let b of ['badScore','okScore','greatScore']){
                                        reviews[a.userid].find('#typeHolder').removeClass(b)
                                    }

                                    if(a.edited){
                                        reviews[a.userid].find("#revised").css('display','inline-block')
                                        reviews[a.userid].find('#revised').text("Revised "+a.edited)
                                    }

                                    if(a.vote=="upvote"){
                                        reviews[a.userid].find('#typeHolder').addClass('greatScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsup.png)")
                                    }else if(a.vote=="mixed"){
                                        reviews[a.userid].find('#typeHolder').addClass('okScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/mixedfull.png)")
                                    }else if(a.vote=="downvote"){
                                        reviews[a.userid].find('#typeHolder').addClass('badScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsdown.png)")
                                    }
                                }
                            }

                            for(let a of res.userReviews){
                                if(!reviews[a.userid]){
                                    reviews[a.userid]=true //We'll change this later
                                    new Promise((resolve,reject)=>{
                                        $.get('https://api.roblox.com/users/'+a.userid,res=>{
                                            resolve(res)
                                        })
                                    }).then(rese=>{
                                        let reviewObject=$(`
                                            <div class="section-content remove-panel" style="
                                                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
                                                width: 100%;
                                                padding: 15px;
                                                margin-bottom: 5px;
                                                ">
                                                <div style="
                                                    display: flex;
                                                    ">
                                                    <div id="typeHolder" style="
                                                        width: 75px;
                                                        height: 75px;
                                                        background-image: url(&quot;http://chittagongit.com//images/white-thumbs-up-icon/white-thumbs-up-icon-26.jpg&quot;);
                                                        background-size: 70%;
                                                        background-repeat: no-repeat;
                                                        background-position: center;
                                                        display: inline-block;
                                                        "></div>
                                                    <div style="
                                                        margin-left: 15px;
                                                        display: inline-block;
                                                        ">
                                                        <div id="reviewUsername" style="
                                                            font-size: 25px;
                                                            ">`+rese.Username+`</div>
                                                        <div id="published">Review published `+a.posted+`</div>
                                                        <div id="revised" style="display: none;">Revised 02/2/2019</div>
                                                    </div>
                                                </div>
                                                <p style="
                                                    margin-top: 20px;
                                                    ">`+a.review+`</p>
                                            </div>
                                        `)

                                        if(a.edited){
                                            reviewObject.find("#revised").css('display','inline-block')
                                            reviewObject.find('#revised').text("Revised "+a.edited)
                                        }

                                        if(a.vote=="upvote"){
                                            reviewObject.find('#typeHolder').addClass('greatScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsup.png)")
                                        }else if(a.vote=="mixed"){
                                            reviewObject.find('#typeHolder').addClass('okScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/mixedfull.png)")
                                        }else if(a.vote=="downvote"){
                                            reviewObject.find('#typeHolder').addClass('badScore')
                                            reviewObject.find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsdown.png)")
                                        }

                                        reviewObject.appendTo($('#userReviewSection'))

                                        reviews[a.userid]=reviewObject
                                    })
                                }else if(typeof reviews[a.userid] != "boolean"){
                                    reviews[a.userid].find('p').text(a.review)

                                    for(let b of ['badScore','okScore','greatScore']){
                                        reviews[a.userid].find('#typeHolder').removeClass(b)
                                    }

                                    if(a.edited){
                                        reviews[a.userid].find("#revised").css('display','inline-block')
                                        reviews[a.userid].find('#revised').text("Revised "+a.edited)
                                    }

                                    if(a.vote=="upvote"){
                                        reviews[a.userid].find('#typeHolder').addClass('greatScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsup.png)")
                                    }else if(a.vote=="mixed"){
                                        reviews[a.userid].find('#typeHolder').addClass('okScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/mixedfull.png)")
                                    }else if(a.vote=="downvote"){
                                        reviews[a.userid].find('#typeHolder').addClass('badScore')
                                        reviews[a.userid].find('#typeHolder').css('background-image',"url(chrome-extension://hjlbdpgppecbhpfgaipakkalhegfofoo/thumbsdown.png)")
                                    }
                                }
                            }
                        }
                    })
                }

                setInterval(update,30000)
                update()
            }
        })
    })
}

function game_filter(){
    let percentage,visits,settings
    $('body').ready(function(){
        //Get current like/dislike ratio percentage (Used to filter games)
        chrome.storage.sync.get('percentage', function(data) {
            percentage = data.percentage;
            if(percentage==undefined){
                chrome.storage.sync.set({ percentage: "25%" });
                percentage="25%";
            }
            chrome.storage.sync.get('visits', function(data) {
                visits=data.visits;
                if(visits==undefined){
                    chrome.storage.sync.set({visits:0});
                    visits=0;
                }
            });
        });
    })

    let alreadyFiltered={}
    setInterval(function(){
        //Let's fix the left side scroll button on the games page, it's visually broken
        $('.horizontally-scrollable').each(function(){
            if(parseInt($(this).css('left').match(/\d+/),10)>0 && $(this).parent().find('.prev').hasClass('disabled')){
                $(this).parent().find('.prev').removeClass('disabled')
            }else if(parseInt($(this).css('left').match(/\d+/),10)===0 && !$(this).parent().find('.prev').hasClass('disabled')){
                $(this).parent().find('.prev').addClass('disabled')
            }
        })
    },50)
    setInterval(function(){
        if(percentage!=undefined && visits!=undefined){
            $('.game-card').each(function(index,value){
                if($(this).find('.game-name-title') && !alreadyFiltered[$(this).find('.game-name-title').text()]){
                    var percentage1=parseInt($(this).find('.vote-percentage-label').text().match(/\d+/),10)
                    let np=parseInt(percentage.match(/\d+/),10)
                    if(percentage1 && !isNaN(percentage1) && percentage1<=np){
                        $(this).css('display','none');
                    }else{
                        //Get href for card
                        var hrefString=$(this).find('#game-card-link').attr('href');
                        if(hrefString){
                            var newString=hrefString.substr(hrefString.indexOf('PlaceId='),hrefString.length);
                            var brandNewString=""; //PlaceID
                            for(var index in newString){
                                var char=newString[index];
                                if(!parseInt(char,10)){continue;}
                                if(char=="&"){break;}
                                brandNewString+=char;
                            }
                        }

                        alreadyFiltered[$(this).find('.game-name-title').text()]=true
                    }
                }
            })
        }
    },250)
}

function revenue_stats(){
    $('body').ready(function(){
        //Message thing
        chrome.storage.sync.get('revStatAlert', function(data) {
            let goodToGo=data.revStatAlert
            if(goodToGo==undefined){
                chrome.storage.sync.set({ revStatAlert: true });
                $(`
                    <div class="col-xs-12 section-content game-main-content follow-button-enabled" style="
                        height: 70px;
                        padding: 0;
                        min-height: 70px;
                        margin-bottom: 5px;
                    "><div style="
                        width: 55px;
                        height: 55px;
                        display: inline-block;
                        position: absolute;
                        left: 10px;
                        top: 8px;
                        background-image: url(&quot;https://t4.rbxcdn.com/00ddd9996f2ecca4d5859eacc8115cb9&quot;);
                        background-repeat: no-repeat;
                        background-size: contain;
                    "></div><div style="
                        margin-top: 15px;
                        display: inline-block;
                        position: absolute;
                        left: 75px;
                        width: 90%;
                        font-weight: bold;
                    ">Hey! Looks like it's your first time visiting a page where we can show you a game's revenue using BetterBlox. This will only show one time, but just in case, if you wanted to enable revenue stats click <a style="font-weight: 400; color: #00A2FF; text-decoration: none;" href="https://www.roblox.com/my/account#!/info">here!</a></div></div>
                `).prependTo($('#game-detail-page'))
            }
        });

        chrome.storage.sync.get('revStatsEnabled', function(data) {
            let rStats=data.revStatsEnabled;
            if(rStats==undefined){
                chrome.storage.sync.set({revStatsEnabled:false});
            }
            if(rStats){
                main()
            }
        })

        //Create robux to local currency thing
        let setting=$(`
            <div class="col-xs-12 section-content game-main-content follow-button-enabled" style="
                padding: 0;
                margin-top: 15px;
                margin-bottom: 15px;
                margin: 0;
                min-height: 25px;
                height: 30px;
                margin-bottom: 5px;
            ">
                <span id="rev-toggle" class="btn-toggle receiver-destination-type-toggle" ng-click="toggleAccountPinEnabledSetting()" ng-class="{'on':accountPinContent.isEnabled}" style="
                    transform: translate(-100%,-50%);
                    top: 50%;
                    position: absolute;
                    left: 99.5%;
                ">
                    <span class="toggle-flip"></span>
                    <span id="toggle-on" class="toggle-on"></span>
                    <span id="toggle-off" class="toggle-off"></span>
                </span>
                <div class="btn-toggle-label ng-binding" ng-show="accountPinContent.isEnabled" ng-bind="'Label.AccountPinEnabled'|translate" style="
                    text-align: right;
                    transform: translate(-100%,-50%);
                    top: 50%;
                    position: absolute;
                    left: 94.5%;
                    height: 80%;
                    width: 25%;
                ">
                    Robux to Local Currency
                </div>
            </div>
        `)
        setting.prependTo($('#game-detail-page'))

        let settingEnabled
        setting.find('#rev-toggle').click(function(){
            settingEnabled=!settingEnabled
            if(settingEnabled){
                $(this).addClass('on')
            }else{
                $(this).removeClass('on')
            }
        })
        setting.find('#rev-toggle').hover(function(){
            $(this).css('cusor','pointer')
        },function(){
            $(this).css('cusor','auto')
        })

        function main(){
            let g,run,run2,total
            let objects=[]
            let gameSalesObject

            $('.game-title-container').css('width','325px')

            setInterval(function(){
                if(!g){
                    $('.store-card').each(function(){
                        if(g){return}
                        if(!$(this).find('.store-card-add')[0]){
                            g=true
                            run()
                            setInterval(function(){
                                run()
                            },120000)
                        }
                    })
                }

                if(!formatter && country){
                    formatter=new Intl.NumberFormat(language,{
                        style: 'currency',
                        currency: country.conversion[1].currency,
                        minimumFractionDigits: 2
                    })
                }

                for(let a=0; a<objects.length; a++){
                    let b=objects[a]
                    if(settingEnabled && country){
                        b.object.find('.icon-robux-16x16').css('display','none')
                        b.object.find('.robux').text(convertCurrency(b.robux)+" "+country.conversion[1].currency)
                    }else{
                        b.object.find('.icon-robux-16x16').css('display','inline-block')
                        b.object.find('.robux').text(b.robux.toLocaleString())
                    }
                }

                if($('#gameSales')[0] && gameSalesObject){
                    if(settingEnabled && country){
                        $('#gameSales').find('.icon-robux-16x16').css('display','none')
                        $('#gameSales').find('.gsRobux').text(convertCurrency(gameSalesObject)+" "+country.conversion[1].currency)
                    }else{
                        $('#gameSales').find('.icon-robux-16x16').css('display','inline-block')
                        $('#gameSales').find('.gsRobux').text(gameSalesObject.toLocaleString())
                    }
                }

                //Set total number
                if(total!=undefined){
                    if(settingEnabled && country){
                        $('#rbx-game-passes').find('h3').text("Passes for this game    ("+convertCurrency(Math.round(total*0.7))+" "+country.conversion[1].currency+")")
                    }else{
                        $('#rbx-game-passes').find('h3').text("Passes for this game    ("+Math.round(total*0.7).toLocaleString()+" Robux)")
                    }
                }
            },1000)

            let gameID=document.location.href.match(/\d+/)
            if(gameID[0]){
                $.get('https://api.roblox.com/Marketplace/ProductInfo?assetId='+gameID,function(data){
                    if(data.IsForSale){
                        let int
                        int=setInterval(function(){
                            if($('.game-creator')[0]){
                                clearInterval(int)
                                run2()
                            }
                        },25)
                    }
                })
            }

            run=function(){
                total=0
                $('.store-card').each(function(){
                    if($(this).find('.store-card-add')[0]){return}
                    let a=$(this).find('a')
                    if(a[0]){
                        let gamepassID=a.attr('href').match(/\d+/)
                        if(gamepassID){
                            let object=$(this)
                            if(!object.find('.store-card-add')[0]){
                                $.get('https://api.roblox.com/Marketplace/Game-Pass-Product-Info?gamepassId='+gamepassID[0],function(data){
                                    if(data){
                                        let totalRobuxMade=data.PriceInRobux*data.Sales
                                        let stats=object.find('.revStatsSimple')
                                        if(!stats[0]){
                                            stats=object.find('.store-card-caption').clone()
                                            stats.addClass('revStatsSimple')

                                            //Remove things
                                            stats.find('.store-card-footer').remove()
                                            stats.find('.store-card-name').remove()

                                            //Remove/Add Classes
                                            stats.find('.store-card-price').attr('id','container')
                                            stats.find('.store-card-price').removeClass('store-card-price')
                                            stats.find('.text-robux').addClass('robux')
                                            stats.find('.text-robux').removeClass('text-robux')

                                            //Add to parent
                                            stats.appendTo(object)
                                        }

                                        let robux=Math.round(totalRobuxMade*0.7)
                                        let good
                                        for(let index in objects){
                                            if(objects[index].object==stats){
                                                objects[index].robux=robux
                                                good=true
                                                break
                                            }
                                        }
                                        if(!good){
                                            objects.push({robux:robux,object:stats})
                                        }
                                        total+=Number(totalRobuxMade)
                                    }
                                })
                            }
                        }
                    }
                })
            }
            run2=function(){
                /*
                <div class="game-creator"><span class="text-label">Sold</span> <a class="text-name" href="https://www.roblox.com/groups/group.aspx?gid=3537987">5,000 copies</a><span class="icon-robux-16x16" style="
        margin-left: 5px;
    "></span><span class="robux" style="
        margin-left: 2px;
    ">4,800</span></div>
                */
                $.get('https://api.roblox.com/Marketplace/ProductInfo?assetId='+gameID,function(data){
                    let gameSales=$('#gameSales')
                    if(!gameSales[0]){
                        gameSales=$('.game-creator').clone()
                        gameSales.attr('id','gameSales')

                        //Change a few things
                        gameSales.find('span').text("Sold")
                        gameSales.find('a').remove()

                        //Add new text
                        gameSales.append($('<span class="text-name" id="copiesSold"></span>'))

                        //Add robux icon and robux text
                        gameSales.append($('<span class="icon-robux-16x16 gsRI"></span>'))
                        gameSales.append($('<span class="gsRobux"></span>'))
                        gameSales.appendTo($('.game-title-container'))
                    }
                    gameSalesObject=Math.round(data.PriceInRobux*data.Sales*0.7)
                    gameSales.find('#copiesSold').text(data.Sales.toLocaleString()+" copies")
                    gameSales.find('.gsRobux').text(Math.round(data.PriceInRobux*data.Sales*0.7).toLocaleString())
                })
            }
        }
    })
}

function revenue_stats_page(){
    $('body').ready(function(){
        chrome.storage.sync.get('revStatAlert', function(data) {
            let goodToGo=data.revStatAlert
            if(goodToGo==undefined){
                chrome.storage.sync.set({ revStatAlert: true });
                $(`
                    <div class="col-xs-12 section-content game-main-content follow-button-enabled" style="
                        height: 70px;
                        padding: 0;
                        min-height: 70px;
                        margin-bottom: 5px;
                        z-index: 1000;
                    "><div style="
                        width: 55px;
                        height: 55px;
                        display: inline-block;
                        position: absolute;
                        left: 10px;
                        top: 8px;
                        background-image: url(&quot;https://t4.rbxcdn.com/00ddd9996f2ecca4d5859eacc8115cb9&quot;);
                        background-repeat: no-repeat;
                        background-size: contain;
                    "></div><div style="
                        margin-top: 15px;
                        display: inline-block;
                        position: absolute;
                        left: 75px;
                        width: 90%;
                        font-weight: bold;
                    ">Hey! Looks like it's your first time visiting a page where we can show you a game's revenue using BetterBlox. This will only show one time, but just in case, if you wanted to enable revenue stats click <a style="font-weight: 400; color: #00A2FF; text-decoration: none;" href="https://www.roblox.com/my/account#!/info">here!</a></div></div>
                `).prependTo($('#item-container'))
            }
        });
    })

    chrome.storage.sync.get('revStatsEnabled', function(data) {
        let rStats=data.revStatsEnabled;
        if(rStats==undefined){
            chrome.storage.sync.set({revStatsEnabled:false});
        }
        if(rStats){
            main()
        }
    })

    //Create robux to local currency thing
    let setting=$(`
        <div class="col-xs-12 section-content game-main-content follow-button-enabled" style="
            padding: 0;
            margin-top: 15px;
            margin-bottom: 15px;
            margin: 0;
            min-height: 25px;
            height: 30px;
            margin-bottom: 5px;
            z-index: 1000;
        ">
            <span id="rev-toggle" class="btn-toggle receiver-destination-type-toggle" ng-click="toggleAccountPinEnabledSetting()" ng-class="{'on':accountPinContent.isEnabled}" style="
                transform: translate(-100%,-50%);
                top: 50%;
                position: absolute;
                left: 99.5%;
            ">
                <span class="toggle-flip"></span>
                <span id="toggle-on" class="toggle-on"></span>
                <span id="toggle-off" class="toggle-off"></span>
            </span>
            <div class="btn-toggle-label ng-binding" ng-show="accountPinContent.isEnabled" ng-bind="'Label.AccountPinEnabled'|translate" style="
                text-align: right;
                transform: translate(-100%,-50%);
                top: 50%;
                position: absolute;
                left: 94.5%;
                height: 80%;
                width: 25%;
            ">
                Robux to Local Currency
            </div>
        </div>
    `)
    setting.prependTo($('#item-container'))

    let settingEnabled
    setting.find('#rev-toggle').click(function(){
        settingEnabled=!settingEnabled
        if(settingEnabled){
            $(this).addClass('on')
        }else{
            $(this).removeClass('on')
        }
    })
    setting.find('#rev-toggle').hover(function(){
        $(this).css('cusor','pointer')
    },function(){
        $(this).css('cusor','auto')
    })

    function main(){
        let gamepassID=document.location.href.match(/\d+/)[0]
        let robuxEarned
        function change(){
            let object=$('#earnings')
            if(!object[0]){
                object=$('.item-type-field-container').clone()
                object.attr('id','earnings')
                object.find('span').remove()

                //Add robux stuff
                object.append($('<span class="icon-robux-16x16 gsRI"></span>'))
                object.append($('<span class="gsRobux"></span>'))
                object.css('margin-bottom','12px')
                object.find('div').text('Earnings')
                object.find('.gsRobux').text("Loading...")
                object.insertBefore('.item-type-field-container')
            }


            $.get('https://api.roblox.com/Marketplace/Game-Pass-Product-Info?gamepassId='+gamepassID,function(data){
                if(data){
                    //Set text
                    robuxEarned=Math.round(data.PriceInRobux*data.Sales*0.7)
                    object.find('.gsRobux').text(robuxEarned.toLocaleString())
                }
            })
        }

        change()
        setInterval(function(){
            change()
        },120000)

        setInterval(function(){
            if(!formatter && country){
                formatter=new Intl.NumberFormat(language,{
                    style: 'currency',
                    currency: country.conversion[1].currency,
                    minimumFractionDigits: 2
                })
            }

            if(robuxEarned){
                if(settingEnabled && country){
                    $('#earnings').find('.icon-robux-16x16').css('display','none')
                    $('#earnings').find('.gsRobux').text(convertCurrency(robuxEarned)+" "+country.conversion[1].currency)
                }else{
                    $('#earnings').find('.icon-robux-16x16').css('display','inline-block')
                    $('#earnings').find('.gsRobux').text(robuxEarned.toLocaleString())
                }
            }
        },1000)
    }
}

function settings_page(){
    function main(data){
        $('.ng-scope').each(function(index,value){
            if($(this).find('.ng-binding').eq(0).text()=="Personal"){
                var clone=$(this).clone();
                clone.attr('window','roblox-game-filter-settings');

                //Change name
                clone.find('.ng-binding').eq(0).text("BetterBlox Settings");
                clone.find('.ng-binding').eq(0).attr("id","betterbloxsettings")

                //Prepare to add cotnent to extension
                var contentSection=clone.find('.section-content').eq(0);
                contentSection.empty();

                //Add percentage changing here
                var formGroup=$(`
                    <div class="form-group percentage-contaienr" style="padding-bottom: 10px;">
                        <label class="text-label account-settings-label ng-binding">
                            Like/Dislike Percentage
                        </label>
                        <input class="form-control input-field ng-pristine ng-valid ng-empty ng-touched" id="percentageInput-RobloxModifier" placeholder="e.g. 25%">
                        <span class="small ng-binding">
                            If a games likes/total is below this percentage then it\'ll be removed.
                        </span>
                        <div class="form-group col-sm-2 save-settings-container">
                            <button id="SavePercentage-Roblox-Game-Filter-Settings" class="btn-control-sm acct-settings-btn ng-binding">
                                Save
                            </button>
                        </div>
                    </div>
                    <div class="section-content notifications-section" style="padding: 0; padding-top: 15px; margin: 0;">
                        <span id="rev-toggle" class="btn-toggle receiver-destination-type-toggle" ng-click="toggleAccountPinEnabledSetting()" ng-class="{'on':accountPinContent.isEnabled}">
                            <span class="toggle-flip">
                            </span>
                            <span id="toggle-on" class="toggle-on">
                            </span>
                            <span id="toggle-off" class="toggle-off">
                            </span>
                        </span>
                        <div class="btn-toggle-label ng-binding" ng-show="accountPinContent.isEnabled" ng-bind="'Label.AccountPinEnabled'|translate">
                            Revenue Stat Display `+(data.revenueStatsEnabled?"Enabled":"Disabled")+`
                        </div>
                    </div>
                `)
                formGroup.find('input').val(data.filterPercentage);
                if(data.revenueStatsEnabled){
                    formGroup.find('#rev-toggle').addClass('on')
                }else{
                    formGroup.find('#rev-toggle').removeClass('on')
                }
                formGroup.appendTo(contentSection);

                //Do saving part
                formGroup.find('button').click(function(){
                    var parsed=parseInt(formGroup.find('input').val(),10);
                    chrome.storage.sync.set({ percentage: isNaN(parsed)?0+"%":parsed+"%" });
                    formGroup.find('input').val(isNaN(parsed)?0+"%":parsed+"%");
                })

                let bD
                formGroup.find('#rev-toggle').click(function(){
                    if(bD){return}
                    data.revenueStatsEnabled=!data.revenueStatsEnabled
                    bD=true
                    chrome.storage.sync.set({ revStatsEnabled:data.revenueStatsEnabled });
                    if(data.revenueStatsEnabled){
                        $(this).addClass('on')
                    }else{
                        $(this).removeClass('on')
                    }
                    bD=false
                })
                formGroup.find('#rev-toggle').hover(function(){
                    $(this).css('cusor','pointer')
                },function(){
                    $(this).css('cusor','auto')
                })

                clone.appendTo($(this).parent());

                //Self-plug
                $('<span class="small ng-binding">Subscribe to <a href="https://youtube.com/c/SpooksHD" style="color: rgb(255,0,0)">SpooksHD</a></span>').appendTo($(this).parent());
            }
        })
    }
    $('body').ready(function(){
        let page
        setInterval(function(){
            if(page!=document.location.href){
                page=document.location.href
                if(page.match("info")){
                    //Get settings
                    chrome.storage.sync.get('percentage', function(data) {
                        let p=data.percentage;
                        if(p==undefined){
                            chrome.storage.sync.set({ percentage: "25%" });
                            p="25%";
                        }
                        chrome.storage.sync.get('revStatsEnabled', function(data) {
                            let rStats=data.revStatsEnabled;
                            if(rStats==undefined){
                                chrome.storage.sync.set({revStatsEnabled:false});
                            }
                            main({
                                revenueStatsEnabled:rStats,
                                filterPercentage:p,
                            })
                        });
                    });
                }
            }
        },100)
    })
}

if(document.location.href.match('my/groupadmin')){
    group_admin()
}else if(document.location.href.match(/games\/\d+/)){
    criticGamePage()
    metaScoreForSmallGameThumbs()
    game_filter()
    revenue_stats()
}else if(document.location.href.match('game-pass/')){
    revenue_stats_page()
}else if(document.location.href.match('my/account')){
    settings_page()
}else{
    metaScoreForSmallGameThumbs()
    game_filter()
}
