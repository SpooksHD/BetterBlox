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

            //Get information for widgets
            let historyCount=0;
            let transactions=[];
            function g(){
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

                        //Just a reasonable check
                        if(historyCount>300*20){
                            return;
                        }

                        //Go ahead and call the function again
                        g();
                    }
                })
            }
            g();

            //Set widgets
            setInterval(function(){
                let today=tzc(-6); //Convert current date to CST since all html endpoints return dates in CST
                let robuxMadeToday=0,robuxMadeThisWeek=0,robuxMadeThisMonth=0;
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
            },500);

            //Parent widgets
            userSearch.appendTo(userObject)
            searchbar.appendTo(searchObject);
            day.appendTo(object);
            week.appendTo(object);
            month.appendTo(object);

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
                if(document.location.href.match('my/account') && settings){
                    settings()
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

    settings=function(){
        if($(".ng-scope").get(0)){
            $('.ng-scope').each(function(index,value){
                if($(this).find('.ng-binding').eq(0).text()=="Personal"){
                    var clone=$(this).clone();
                    clone.attr('window','roblox-game-filter-settings');

                    //Change name
                    clone.find('.ng-binding').eq(0).text("Game Filter Settings");

                    //Prepare to add cotnent to extension
                    var contentSection=clone.find('.section-content').eq(0);
                    contentSection.empty();

                    //Add percentage changing here
                    var formGroup=$('<div class="form-group percentage-contaienr"><label class="text-label account-settings-label ng-binding">Like/Dislike Percentage</label><input class="form-control input-field ng-pristine ng-valid ng-empty ng-touched" id="percentageInput-RobloxModifier" placeholder="e.g. 25%"><span class="small ng-binding">If a games likes/total is below this percentage then it\'ll be removed.</span><div class="form-group col-sm-2 save-settings-container"><button id="SavePercentage-Roblox-Game-Filter-Settings" class="btn-control-sm acct-settings-btn ng-binding">Save</button></div></div>')
                    formGroup.find('input').val(percentage);
                    formGroup.appendTo(contentSection);

                    //Do saving part
                    formGroup.find('button').click(function(){
                        var parsed=parseInt(formGroup.find('input').val(),10);
                        chrome.storage.sync.set({ percentage: isNaN(parsed)?0+"%":parsed+"%" });
                        formGroup.find('input').val(isNaN(parsed)?0+"%":parsed+"%");
                    })

                    clone.appendTo($(this).parent());

                    //Self-plug
                    $('<span class="small ng-binding">Subscribe to <a href="https://youtube.com/c/SpooksHD" style="color: rgb(255,0,0)">SpooksHD</a></span>').appendTo($(this).parent());
                }
            })
        }
    }
}

if(document.location.href.match('my/groupadmin')){
    group_admin()
}else{
    game_filter()
}
