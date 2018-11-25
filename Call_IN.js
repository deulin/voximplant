var accNumber,accessURL,logURL,sessionId,callUID,inCall,ResArr,name,timeOut,users=[],conected=false;//если есть соединение с user.voxLogin, то равна user.voxLogin иначе false

require(Modules.Recorder);

//Обработчик поднятия трубки и отключение
VoxEngine.addEventListener(AppEvents.HttpRequest,function (e) {
  data = e.content.split('&'); //VoxEngine.customData().split(':');
  //conectToOperator("Николай", "pal");
  if(data[0]=="1"){conectToOperator(data[1], data[2])}
  else if(data[0]=="0"){VoxEngine.terminate()}
})

//При поступлении звонка заполняем глобальные переменные
VoxEngine.addEventListener(AppEvents.Started, function (e) {
  accessURL = e.accessSecureURL;
  logURL = e.logURL;
  sessionId = e.sessionId;
});


VoxEngine.addEventListener(AppEvents.Terminated, function(e) {
  endCall();
  VoxEngine.terminate();
});


VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  inCall = e.call;
  inCall.addEventListener(CallEvents.Disconnected, function(e) {
    failedCall();
    VoxEngine.terminate()
  });

  //Обработчик КалБэков
  inCall.addEventListener(CallEvents.Connected, function(e) {
    timeOut = 0;
    users.forEach(function(user, i, users) {
      timeOut = timeOut + user.timeOut*1000
      setTimeout( function (e){
        if(conected == false)
        {
          user.cbCall = conectToOperatorsMobile(inCall, name, user.voxLogin, user.cbNum);
        }
      }, timeOut);
    })
  });

  accNumber = e.destination;
  var opt = new Net.HttpRequestOptions();
  opt.postData = accNumber +";"+ e.callerid +";"+ accessURL +";"+ sessionId+";" + logURL;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/init', opt)
  .then(function(result)
        {
          if(result.code=='200')
          {
            ResArr = result.text.split(';');
            IVRArr = ResArr[0].split("|");
            callUID = IVRArr[0];
            name = IVRArr[1];
            IVRURL = IVRArr[2];
            ResArr.forEach(function(item, i, ResArr) {
              if(i>0){
                userArr = item.split("|");
                users[users.length] =
                  obj = {
                  voxLogin:userArr[0],
                  pioritet:parseInt(userArr[1]),
                  timeOut:parseInt(userArr[2]),
                  cbNum:userArr[3],
                  operCall:false,
                  cbCall:false,
                  conected:false
                }}});

            inCall.answer();
            inCall.startPlayback(IVRURL, false);
            inCall.record({stereo: true, hd_audio: true, name: "Входящий от "+inCall.number});

            }}
       )
})



//Соединения зонка с оператором по логину
function conectToOperator(name, voxLogin)
{
  var operCall = VoxEngine.callUser(voxLogin, inCall.callerid);

  operCall.addEventListener(CallEvents.Failed, function (e) {
    operCall.hangup();
    conected = false
  });

  operCall.addEventListener(CallEvents.Connected, function (e) {
    DisconectOtherCall(operCall);
    conected = voxLogin
    operCall.say('Звонок от абонента' + name, Language.RU_RUSSIAN_FEMALE);

    operCall.addEventListener(CallEvents.PlaybackFinished, function (e){
      VoxEngine.sendMediaBetween(operCall, inCall);
    });
    StartCall(voxLogin);
  });

  operCall.addEventListener(CallEvents.Disconnected,  function (e) {

    endCall();
    VoxEngine.terminate();
    conected = false
  });



  //setTimeout( function (e) {if(conected){operCall.hangup()}}, parseInt(timeOut));
  return operCall
}




//Калбэк с оператором по логину
function conectToOperatorsMobile(inCall, name, voxLogin, number)
{
  var operCall = VoxEngine.callPSTN(number, accNumber);

  operCall.addEventListener(CallEvents.Failed, function (e) {
    operCall.hangup();
    conected = false
  });

  operCall.addEventListener(CallEvents.Connected, function (e) {
    DisconectOtherCall(operCall);
    operCall.say('Звонок от абонента ' + name, Language.RU_RUSSIAN_FEMALE);

    operCall.addEventListener(CallEvents.PlaybackFinished, function (e){
      VoxEngine.sendMediaBetween(operCall, inCall);
      conected = voxLogin
    });
    StartCall(voxLogin);

  });
  operCall.addEventListener(CallEvents.Disconnected,  function (e) {
    endCall();
    VoxEngine.terminate();
    conected = false
  });

  //setTimeout( function (e) {if(conected){operCall.hangup()}}, parseInt(timeOut));
  return operCall
}


//Завершает все вызовы кроме этого
function DisconectOtherCall(okCall)
{
  users.forEach(function(user, i, users) {
    if(user.operCall != false && user.operCall != okCall){
      user.operCall.hangup();
      user.operCall=false;
    }
    if(user.cbCall != false && user.cbCall != okCall){
      user.cbCall.hangup();
      user.cbCall=false;
    }

  })
}

function StartCall(voxLogin)
{
  var opt = new Net.HttpRequestOptions();
  opt.postData = voxLogin + ";" + callUID +";" + sessionId;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/start', opt)
  .then(function(result){

  });
}

function endCall()
{
  var opt = new Net.HttpRequestOptions();
  opt.postData = sessionId;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/end', opt)
  .then(function(result){

  });
}

function callerAnswered()
{
  var opt = new Net.HttpRequestOptions();
  opt.postData = voxLogin + ";" + callUID +";" + sessionId;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/answered', opt)
  .then(function(result){

  });
}

function failedCall()
{
  var opt = new Net.HttpRequestOptions();
  opt.postData = callUID; //accNumber +";"+ e.callerid +";"+ accessURL +";"+ sessionId;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/infld', opt)
  .then(function(result)
        {
          if(result.code=='200')
          {

          }})
}

function call_1C(e,comName,continueConnect)
{

  var opt = new Net.HttpRequestOptions();
  opt.postData = comName +";"+ callUID +";"+ sessionId +";"+ voxLogin +";"+ e.code +";"+ e.reason +";"+ accessURL;
  opt.method = 'post';
  Net.httpRequestAsync('http://b24:23698252@s01.motivix.mykeenetic.net/pc/hs/voximplant/outcall', opt)
  .then(function(result){
    if(result.code!='200')
    {
      VoxEngine.terminate();
    }
  });
  if (continueConnect == false) {
    VoxEngine.terminate();
  }
}
