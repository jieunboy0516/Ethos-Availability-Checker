const https = require('https');

var data = {}

//var intervalId = setInterval(function(){
  updateData(getarrofDates())      

//}, 2000);


function getarrofDates(){

  const today = new Date();


  var arr = [] 

  for(var i = 5; i < 10; i++){
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
        data[date] = JSON.parse(_data.toString())
        
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
const port = 3000

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

  

  let reply = ''

  Object.keys(data).forEach(function(key) { 
    var datedata = data[key];
    

    for (const activity of datedata){
      
      if(activity.DisplayName.includes("Badminton") && activity.AvailablePlaces > 0){
        reply += activity.StartTime + "\n"
      }
      
    }

    reply += "\n\n\n"

  });


  console.log(reply)
}

