const express = require('express');
const request = require('request-promise');
const {spawn} = require('child_process');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/',(req,res) => {

    res.send("Welcome to the Amazon info API !");
});

app.get('/products/:productId', async (req,res) => {
    const { productId } = req.params;
    console.log('- product id:',productId);
    const python = spawn('python', ['./scraper_module.py',productId]);
    let json_file_name = ""
    try{
        python.stdout.on('data', function (data) {
            json_file_name = data.toString().replace(/(\r\n|\n|\r)/gm, "");
            rawdata = fs.readFileSync(json_file_name);
            let punishments= JSON.parse(rawdata);
            res.send(punishments);
        });
    } catch (error) {
        console.log('- Error !',error);
    }

});


app.listen(PORT, ()=>{console.log('Server is running on port:'+PORT)});