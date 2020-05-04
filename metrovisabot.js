const discord = require('discord.js');
const client = new discord.Client();
//const config = require('./config.json');
const fetch = require('node-fetch').default;

client.login(process.env.BOT_TOKEN)
//client.login(config.token);

//console log when bot online
client.on('ready', () => {
    console.log('bot online')
});

//Lists and dictionaries, mapping the details for the API call (notice finnish and english)
const categories = ["yleistieto", "kirjat", "elokuvat", "musiikki", "televisio", "videopelit", "lautapelit", "tiede ja luonto",
"tietokoneet", "mytologia", "urheilu", "maantieto", "historia", "politiikka", "taide", "eläimet"]
const categoryDict = {"yleistieto": 9, "kirjat": 10, "elokuvat": 11, "musiikki": 12, "televisio": 14, "videopelit": 15, "lautapelit": 16, "tiede ja luonto": 17,
"tietokoneet": 18, "mytologia": 20, "urheilu": 21, "maantieto": 22, "historia": 23, "politiikka": 24, "taide": 25, "eläimet": 27}

const difficulties = ["", "heleppo", "meedium", "pappa"]
const difficultyDict = {"heleppo": "easy", "meedium": "medium", "pappa": "hard"}

//define empty lists for tracking correct answers and player answers
let playerAnswers = []
let correctAnswers = []
let tenkat = []
//let amount = undefined
let diff = undefined
let cat = undefined
let todayDate = undefined

//send message for the chat, is used e.g. below in qAndA
async function sendMsg(m, msg) {
    m.channel.send(msg);
}

//question and answer, send question to chat and wait for the answer
async function qAndA(q, m, f) {
    sendMsg(m, q)
    const result = await m.channel.awaitMessages(f, {max: 1});
    return result.first().content.toLowerCase()
}

//get current days namedays from API  TÄMÄ KUSEEEEEEEEEEEEEEEEEEE
async function getNameday() {
    todayDate = new Date().toISOString().slice(0,10);
    const namedates = await fetch("http://www.webcal.fi/cal.php?id=4&format=json&start_year=current_year&end_year=current_year&tz=Europe%2FHelsinki")
    const nameData = await namedates.json();

    for(j = 0; j < nameData.length; j++) {
        const date = nameData[j].date
        if (date === todayDate) {
            return nameData[j].name
        }
    }
    return "(nähtävissä täällä http://www.webcal.fi/cal.php?id=4&format=json&start_year=current_year&end_year=current_year&tz=Europe%2FHelsinki)"
}

//print instructions for the bot, first thing after starting the quiz
function printInstructions(m) {
    sendMsg(m, "**KOMENNOT:** * **'-visa'** TAI **'-yksvielä'** = aloittaa visan, **'tenkat'** = näyttää mahdolliset tenkat. **'-apua'** = apua ja motivaatiota jatkaa hommia \n **MITEN VISAILLAAN**: Kysymyksiin vastataan kirjoittamalla (esim. kopiopasta) vastaus kysymyksen jälkeen. Vain pelin aloittaja voi vastata kysymyksiin. Huomioithan että tenkan voi saada vain kun suorittaa 10 kysymyksen pappavisan täysin pistein! (Pahoittelut että kysymykset ovat englanniksi (Suoraa palautetta voi laittaa mao-listalle))*")
}

//print intro with namedayheroes
async function printIntro(m) {
    // :D 
    const nameheroes = await getNameday()
    sendMsg(m, "Tervetuloa (metro) visaan. Nimipäiviään tänään viettä(vät) " + nameheroes + "\n")
}

function validateAnswers(answers, answerOptions) {
    for(i = 0; i < answers.length; i++) {
        if(!answerOptions[i].includes(answers[i])) {
            return false
        } 
    }
    return true
}

//ask details for quiz, use parameters for quiz API call (https://opentdb.com/api_config.php)
async function askDetails(m, f) {
    let validDetails = false
    while(!validDetails) {
        cat = await qAndA("Mikä kategoria laitetaan? \n" + "```"+categories.toString().split(",").join("\n")+"```", m, f)
        diff = await qAndA("Mikä vaikeusaste tällä kertaa? \n" + "```"+difficulties.toString().split(",").join("\n")+"```", m, f)
        //amount = await qAndA("Kuinka monta kysymystä laitetaan (1-20)? \n", m, f)

        validDetails = validateAnswers([cat, diff], [categories, difficulties])
        if(validDetails) {
            validDetails = true
            category = categoryDict[cat]
            difficulty = difficultyDict[diff]

            //sendMsg(m, "Valitsitte " + amount + " " + diff + "" + " kysymystä kategoriasta " + cat)

            return [category, difficulty]
        } else {
            sendMsg(m, "Tarkista oikeinkirjoitus! (Kannattaa kopipastata tekstit)")
        }
    }
}

//handle asking question, answers and manage player answers
async function askQuestion(m, data, ind, f) {
    let validAnswer = false
    const curQuestion = data.results[ind]
    const question = curQuestion.question;
    const corAnswer = curQuestion.correct_answer;

    const rngNumber = Math.floor(Math.random() * 3)
    curQuestion.incorrect_answers.splice(rngNumber, 0, corAnswer);
    allAnswers = curQuestion.incorrect_answers.map(x => x.toLowerCase())

    console.log("in vittu, kysymys: " + question)

    m.channel.send("**"+question+"**" + '\n');
    m.channel.send(allAnswers)

    do {
        let curAnswer = await m.channel.awaitMessages(f, {max: 1});
        console.log("vastaussetit: " + curAnswer.first().content + "  " + allAnswers)
        let validAnswers = validateAnswers([curAnswer.first().content], [allAnswers])
        if(validAnswers) {
            validAnswer = true
            let ans = curAnswer.first().content;
            playerAnswers.push(ans)
            correctAnswers.push(corAnswer)
            return
        }
        sendMsg(m, "Tarkista vastauksen oikeinkirjoitus!")
    } while(!validAnswer)
}

//calculate how much did the players get right 
async function calculateResults(m) {
    let points = 0
    let total = correctAnswers.length

    for(y = 0; y < correctAnswers.length; y++) {
        if(playerAnswers[y].toLowerCase() === correctAnswers[y].toLowerCase()) {
            points++
        }
    }

    let player = m.member.user.tag.split("#")[0] ? m.member.user.tag.split("#")[0] : 'se pitkä jätkä' 

    if(diff === 'pappa' && points === 10) {
        tenkat.push("Tenkan saaja (pääpelaaja): " + player + ". Päivämäärä: " + todayDate + ". Kategoria: " + cat)
        sendMsg(m, "TENKKA! NYT SITÄ MÄRKÄÄ VGV!!!")
    }

    let successRatio = points / total 
    let message = "Visa päättyi!"

    if(successRatio < 0.65) {
        message = "Aijaijai väärin meni, eiköhä oteta uus! "
    } 
    else if(successRatio >= 0.66 && successRatio < 0.8) {
        message = "Löysää, ihan kiva mut kyll pystyy parantaa. Se yks ois ehkä menny toleranssiin! "
    }
    else {
        message = "Hienosti! Vanhukset osaa ja osaajat tietää! "
    }

    sendMsg(m, "" + message + "Saitte **" + points + "/" + total + "** oikein. \n Oikeat vastaukset olivat ```" + correctAnswers + "``` \n Kiitos visanpitäjälle: " + player)
    playerAnswers = []
    correctAnswers = []
    points = 0
}

function printTenkat(m) {
    sendMsg(m, "*Huomioikaa etten käytä (vielä) tietokantaa joten tenkat katoavat jos minut laitetaan pois päältä*")
    if(tenkat.length > 0) {
        sendMsg(m, "**TENKAT: \n " + "```" + tenkat + "```**")
    } else {
        sendMsg(m, "Löyysää, ei vielä yhtään tenkkaa. ")
    }
}

async function getInspirationaQuote(m) {
    let quoteResponse = await fetch("https://type.fit/api/quotes")
    let data = await quoteResponse.json()
    console.log(data.length)
    let rng = Math.floor(Math.random() * data.length)
    let quote = data[rng].text
    sendMsg(m, "```" + quote + "```")
}

//MAIN LOGIC BELOW

//listen for messages, start the quiz
client.on('message', async m => {

    //check author not bot
    if(m.author.bot) return;

    // if(m.content.toLowerCase() === '-gisluokkaan') {
    //     sendMsg(m, "Aika palata sorvin ääreen, kiitos visanpitäjälle!")
    //     client.destroy()
    //     client.login(config.token);
    // } 

    if(m.content.toLowerCase() === '-tenkat') {
        printTenkat(m)
    }

    if(m.content.toLowerCase() === '-apua') {
        getInspirationaQuote(m)
    }

    //filter to check if message sender is the starter of the quiz (only he/she can answer to prevent spamming)
    const f = msg => msg.author.id === m.author.id;

    //start visa if message is -visa
    if(m.content.toLowerCase() === '-visa' || m.content.toLowerCase() === '-yksvielä') {
        printInstructions(m)
        const details = await askDetails(m, f);
        printIntro(m)

        const apiParam = 'https://opentdb.com/api.php?amount=10&category='+ details[0] +'&difficulty='+ details[1] +'&type=multiple'
        const response = await fetch(apiParam)
        const data = await response.json();

        console.log(data + " " + apiParam)

        for (i in data.results) {
            console.log("vittu")
            await askQuestion(m, data, i, f)
        } 

        calculateResults(m)
    }
});