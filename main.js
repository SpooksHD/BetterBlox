/*
    Author: Spooks_HD (@Spooksletsky on twitter)
    Last Update: Finished off group revenue filtering mechanics
    Note: Hello random person who is looking at this code, welcome to Hell :)
*/
var print=console.log;

function tzc(offset){
   let d=new Date()
   return new Date((d.getTime()+(d.getTimezoneOffset()*60000))+(3600000*offset))
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
                                    <td class="amount">`+a.amount+` Robux</td>
                                    <td class="ccgame">`+gameName+`</td>
                                </tr>
                            `)
                            userHolder.find('tbody').prepend(usersInHolder[idKey])
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
                day.find('p').text('$R '+Math.round(robuxMadeToday*0.7).toLocaleString());
                week.find('p').text('$R '+Math.round(robuxMadeThisWeek*0.7).toLocaleString());
                month.find('p').text('$R '+Math.round(robuxMadeThisMonth*0.7).toLocaleString());
                year.find('p').text('$R '+Math.round(robuxMadeThisYear*0.7).toLocaleString());
                allTime.find('p').text('$R '+Math.round(robuxMadeAllTime*0.7).toLocaleString());
            },500);

            //Parent widgets
            userSearch.appendTo(userObject)
            searchbar.appendTo(searchObject);
            day.appendTo(object);
            week.appendTo(object);
            month.appendTo(object);
            year.appendTo(object)
            allTime.appendTo(object)

            parent.prepend(userHolder)
            parent.prepend(userObject);
            parent.prepend(searchObject);
            parent.prepend(object);
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
        function main(){
            let g,run,run2,total
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

                //Set total number
                if(total!=undefined){
                    $('#rbx-game-passes').find('h3').text("Passes for this game ("+Math.round(total*0.7).toLocaleString()+" Robux)")
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


                                        //Set text
                                        stats.find('.robux').text(Math.round(totalRobuxMade*0.7).toLocaleString())
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
    function main(){
        let gamepassID=document.location.href.match(/\d+/)[0]
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
                    object.find('.gsRobux').text(Math.round(data.PriceInRobux*data.Sales*0.7).toLocaleString())
                }
            })
        }

        change()
        setInterval(function(){
            change()
        },120000)
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
}else if(document.location.href.match('games/')){
    game_filter()
    chrome.storage.sync.get('revStatsEnabled', function(data) {
    })
    revenue_stats()
}else if(document.location.href.match('game-pass/')){
    revenue_stats_page()
}else if(document.location.href.match('my/account')){
    settings_page()
}else{
    game_filter()
}
