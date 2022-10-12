const https = require('https');

var data = {}

var intervalId = setInterval(function(){

  updateData(getarrofDates())      

}, 1000 * 15);


function getarrofDates(){

  const today = new Date();


  var arr = [] 

  for(var i = 0; i < 15; i++){
    var newdate = new Date();
    newdate.setDate(today.getDate() + i);
    arr.push(newdate)
    //console.log(newdate);
  }

  var ret = []

  for (const x of arr){
    
    const date = x.getDate()        // 24
    const month = x.getMonth() + 1  // 10 (Month is 0-based, so 10 means 11th Month)
    const year = x.getFullYear()    // 2020
  
    // prints date in YYYY-MM-DD format
    //console.log(year + "/" + month + "/" + date);
    
    ret.push(year + "/" + month + "/" + date)
  }

  return ret
}


function updateData(dates){
  
  data = {}

  for (const date of dates){

    https.get(`https://www.imperial.ac.uk/sport/members/en/api/Sites/1/Timetables/Bookings?date=${date}%2000:00:00.000&pid=81918`, (resp) => {


      let _data = ""
    
      // A chunk of data has been received.
      resp.on('data', (chunk) => {
        _data += chunk;
      });
    
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        //console.log(JSON.parse(_data.toString()))
        try {
          JSON.parse(_data.toString())
          data[date] = JSON.parse(_data.toString())
        } catch (e) {
          return  
        }
        
      });
    
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });

    var waitTill = new Date(new Date().getTime() + 0.5 * 1000);
    while(waitTill > new Date()){}
    
  }


  

}



updateData(getarrofDates())  



const express = require('express')
const app = express()
const port = process.env.PORT || 5000


const path = require('path')

app.use(express.static(path.join(__dirname, 'public'))).set('views', path.join(__dirname, 'views')).set('view engine', 'ejs')

app.get('/abc', (req, res) => res.render('pages/index'))

app.get('/', (req, res) => {

  
  res.send(generateReply())

})

app.get('/test', (req, res) => {

  generateReply()

  res.send("test")
})





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



function generateReply(){

  console.log("number of dates in data: " + Object.keys(data).length)

  let reply = 'LEE JI EUN I LOVE YOU \n <br/>\n <br/>'

  Object.keys(data).forEach(function(key) { 
    var datedata = data[key];
    

    for (const activity of datedata){
      
      if(activity.DisplayName.includes("Badminton") && activity.AvailablePlaces > 0){
        reply += activity.StartTime + "\n <br/>"
      }
      
    }

    reply += "\n\n\n <br/><br/><br/>"

  });


  console.log(reply)

  return reply
}

