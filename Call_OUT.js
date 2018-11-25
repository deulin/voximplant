var accNumber, number, OP_call, ABON_call, voxLogin, userMobile, ttsMsg, callUID, data, accessURL, sessionId;

VoxEngine.addEventListener(AppEvents.Started, function (e) {ScriptStarted(e)});
VoxEngine.addEventListener(AppEvents.Terminating, function (e) {
  call_1C(e,"СессияЗавершена",true)
});

//1С положила трубку
VoxEngine.addEventListener(AppEvents.HttpRequest,function (e) {
  data = e.content.split('&');
  if(data[0]=="0"){call_1C(e,"ОнлайнКлиентПоложилТрубку",false)} // Не стал создавать отдельную обработку в 1С так как функция дублируется
})




//1С отправила исходящий звонок
function ScriptStarted(e) {

  data = VoxEngine.customData();
  data = data.split(":");

  voxLogin = data[0];//логин Пользователя voximplant
  accNumber = data[1];//НомерЛинии
  userMobile = data[2];//Мобильный телефон оператора
  number = data[3];//НомерАбонента
  ttsMsg = data[4];//Сообщение Пользователю
  callUID = data[5];//УИД Звонка в 1С
  accessURL = e.accessSecureURL;//Ссылка управления сессией
  sessionId = e.sessionId;//ИД сессии

  //Регистрируем сессию в 1С
  call_1C(e,"РегистрацияСессии",true);

  // ЗВОНИМ ПОЛЬЗОВАТЕЛЮ
  OP_call = VoxEngine.callUser(voxLogin,accNumber,ttsMsg);


  OP_call.addEventListener(CallEvents.Connected, function (e) {OP_call_connected(e)});
  OP_call.addEventListener(CallEvents.Disconnected, function (e) {call_1C(e,"ОнлайнКлиентПоложилТрубку",false)});
  OP_call.addEventListener(CallEvents.Failed, function (e) {connectTo_OperMobile(e)});


}





function OP_call_connected(e) {
  // первый звонок соединен успешно, проигрываем сообщение
  call_1C(e,"ОнлайнКлиентПоднялТрубку",true);
  OP_call.say(ttsMsg, Language.RU_RUSSIAN_FEMALE);
  OP_call.addEventListener(CallEvents.PlaybackFinished, function(e) {
    OP_call.playProgressTone("RU");
    ABON_call = VoxEngine.callPSTN(number,accNumber);
    // обработчики событий
    ABON_call.addEventListener(CallEvents.Connected, function (e) {abonentConnect(e)});
    ABON_call.addEventListener(CallEvents.Disconnected,  function (e) {call_1C(e,"АбонентПоложилТрубку",false)});
    ABON_call.addEventListener(CallEvents.Failed, function(e) {
      //  486	Destination number is busy
      //  487	Request terminated
      //  603	Call was rejected
      //  404	Invalid number
      //  480	Destination number is unavailable
      //  402	Insufficient funds
      var fldMsg;
      switch (e.code) {
        case 486:
        fldMsg = "Абонент " + name + " занят";
        break;
        case 487:
        fldMsg = "Абонент " + name + " не отвечает";
        break;
        case 603:
        fldMsg = "Абонент " + name + " отклонил звонок";
        break;
        case 404:
        fldMsg = "Неправильный номер";
        break;
        case 480:
        fldMsg = "Абонент " + name + " не доступен";
        break;
        case 402:
        fldMsg = "Недостаточно средств"
          break;
        default:
          fldMsg = "Звонок не удался по неизвестным причинам"
      }

      OP_call.say(fldMsg, Language.RU_RUSSIAN_FEMALE);
      OP_call.addEventListener(CallEvents.PlaybackFinished, function (e) {call_1C(e,"Недозвон",false)});
    });
  })
}


//Калбэк с оператором по логину
function connectTo_OperMobile(e)
{
  call_1C(e,"ДозвонДоМобильногоОператора",true);
  var OP_call = VoxEngine.callPSTN(userMobile, accNumber);

  OP_call.addEventListener(CallEvents.Failed, function (e) {
    call_1C(e,"МобильныйОператорНеПодключен",false)
  });

  OP_call.addEventListener(CallEvents.Connected, function (e) {
    call_1C(e,"МобильныйОператорПоднялТрубку",true);
    
    OP_call.say(ttsMsg, Language.RU_RUSSIAN_FEMALE);
    OP_call.addEventListener(CallEvents.PlaybackFinished, function (e){
      OP_call.playProgressTone("RU");
      ABON_call = VoxEngine.callPSTN(number,accNumber);
      // обработчики событий
      ABON_call.addEventListener(CallEvents.Connected, abonentConnect(e));
      ABON_call.addEventListener(CallEvents.Disconnected,  function (e) {call_1C(e,"АбонентПоложилТрубку",false)});
      ABON_call.addEventListener(CallEvents.Failed, function(e) {
        //  486	Destination number is busy
        //  487	Request terminated
        //  603	Call was rejected
        //  404	Invalid number
        //  480	Destination number is unavailable
        //  402	Insufficient funds
        var fldMsg;
        switch (e.code) {
          case 486:
          fldMsg = "Абонент " + name + " занят";
          break;
          case 487:
          fldMsg = "Абонент " + name + " не отвечает";
          break;
          case 603:
          fldMsg = "Абонент " + name + " отклонил звонок";
          break;
          case 404:
          fldMsg = "Неправильный номер";
          break;
          case 480:
          fldMsg = "Абонент " + name + " не доступен";
          break;
          case 402:
          fldMsg = "Недостаточно средств"
            break;
          default:
            fldMsg = "Звонок не удался по неизвестным причинам"
        }

        OP_call.say(fldMsg, Language.RU_RUSSIAN_FEMALE);
        OP_call.addEventListener(CallEvents.PlaybackFinished, function (e) {call_1C(e,"Недозвон",false)});
      });

    });
  });
  OP_call.addEventListener(CallEvents.Disconnected, function (e) {call_1C(e,"МобильныйОператорПоложилТрубку",false)});
  return OP_call
}




function abonentConnect(e) {
    call_1C(e,"АбонентПоднялТрубку",true);
  // соединяем два звонка - звук
  VoxEngine.sendMediaBetween(OP_call, ABON_call);
  ABON_call.record({stereo: true, hd_audio: true, name: "разговор оператора "+OP_call.number+" to "+ABON_call.number});
  // и сигнализацию
  // VoxEngine.easyProcess(OP_call, ABON_call);

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
