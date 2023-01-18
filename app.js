defiant = ["You Suck", "You'll never kill Us", "Just give up", "We are indestructable", "You bad at killing us", "Your a loser", "Your the pest here", "bZZZZZZZZZZZZZZZZZZZZZZZZZ","Is this the worse you can do", "Can't catch me", "Too slow hahah", "My grandma is faster than you"]
beg = ["Please Leave us Alone", "Mercy Mercy", "Dont Kill Us", "We will leave", "bZZZZZZZZ", "I have a family", "stop stop stop stop", "We can talk about this", "we are sorry.... truce?", "please let me live"]

function init() {
    messages = document.getElementById("msg")
}


function random(min, max) {
    return Math.round(Math.random() * (max - min) + min)
}

function play_splat() {
    var audio = document.getElementById("splat_audio");
    audio.play();
}

function start() {
    var x = window.innerWidth - 200;
    var y = window.innerHeight - 200;
    for (var i = 0; i < 15; i++) {
        // Collide with output bar so bump up 150
        create_bug(random(0, x), random(150, y))
    }
}

function get_responce() {
    if (document.querySelectorAll(".alive_bug").length > 8) {
        return defiant.splice(random(0, defiant.length),1)
    }
    else if (document.querySelectorAll(".alive_bug").length === 0) {
        alert("YOU SUCK")
        return "You've splatter us all"
    }
    else {
        return beg.pop(random(0, beg.length))
    }
}

function create_bug(x, y) {
    var img = document.createElement("img")
    img.src = "bug-removebg-preview.png"
    img.style.left = x + "px"
    img.style.top = y + "px"

    img.style.width= "5%"
    img.style.height = "auto"
    img.style.position = "absolute"
    img.classList.add('alive_bug')
    document.getElementById("body").appendChild(img)

    img.addEventListener('click', (self) => {
        // Delete Bug, self is click event
        self.target.src = "dead-removebg-preview.png"

        img.classList.remove('alive_bug')
        img.classList.add('dead_bug')
        // Say smth
        messages.innerHTML = get_responce() 
        // Make noise on death
        play_splat()

    // Trigger once only
    }, { once:true})
}
