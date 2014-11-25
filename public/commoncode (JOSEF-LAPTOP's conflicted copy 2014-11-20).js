ClientCheck();
window.setInterval(function(){
        ClientCheck();
}, 10000);
function ClientCheck () {
    $.ajax({
        type : "POST",
        url : '/check',
        success : function (data){
        }
    })
}   
var HttpClient = {
 		get : function(aUrl, aCallback) {
	anHttpRequest = new XMLHttpRequest();
	anHttpRequest.onreadystatechange = function() { 
        if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
            aCallback(anHttpRequest.responseText);
        }
        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
	}
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
    }
    return "";
}
function CheckLogIn () {
        console.log("CheckLog");
    $.ajax({
        type: "GET",
        url: "/headeruser",
        success: function (data){
            SetHeader(data);
        }
    })
}
function SetHeader (data) {
    if (data==true){
            document.getElementById('logsign').innerHTML = 'Sign Out';
    }
}
function CheckForEnter (toChange) {
    key = window.event.keyCode;
    if (key==13){
        event.preventDefault();
        if(toChange=='registersubmit'){
            SendUserInfo();
            return;
        }else if (toChange=='loginsubmit'){
            CheckUserInfo();
        }else {
            document.getElementById(toChange).focus();
        }
    }
}