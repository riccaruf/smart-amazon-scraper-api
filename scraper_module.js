const { timeout } = require("nodemon/lib/config");
var JSSoup = require('jssoup').default;

module.exports = {
    scrapeMe : amazonScraper
}

const WEB_URL = "https://www.amazon.it/";
const By = require('selenium-webdriver').By;

async function getCategoryUrl(value){
    var formattedCategoryName = value.replace (" ","+");
    var categoryUrl = WEB_URL+"s?k="+formattedCategoryName+"&ref=nb_sb_noss";
    console.log("- getCategoryUrl:",categoryUrl);
    return categoryUrl;
}

async function navigateToOtherPages(driver,categoryUrl,jsonResult){

    try{
        maxNumberOfPages = "//span[@class='s-pagination-item s-pagination-disabled']";
        numberOfPagesEl = await driver.findElement(By.xpath(maxNumberOfPages));
        numberOfPages = await numberOfPagesEl.getText();
    }catch(error){
        //console.log("- navigateToOtherPages error:",error);
        maxNumberOfPages = "//li[@class='a-normal'][last()]"
        numberOfPagesEl = await driver.findElement(By.xpath(maxNumberOfPages));
        numberOfPages = await numberOfPagesEl.getText();

    }

    console.log("- numberOfPages:",numberOfPages);

    for (var i = 2; i< parseInt(numberOfPages) + 1; i++){
        // Goes to next page
        console.log("- page:",i);
        nextPageUrl = categoryUrl + "&page=" + i;
        console.log("- nextPageUrl:",nextPageUrl);

        driver.get(nextPageUrl);

        //Webpage information is stored in page_results
        pageResults = await extractWebpageInformation(driver);
        tempRecord = await  extractProductInformation(pageResults,jsonResult);
        console.log("- extractProductInformation extracted for:",i);
    }
    //console.log("- return tempRecord:",tempRecord);
    return tempRecord;

}

async function extractWebpageInformation(driver){
    var source = await driver.getPageSource();
    //console.log("- source:",source);
    var soup = new JSSoup(source);
    pageResults = soup.findAll('div', {'data-component-type': 's-search-result'});
    //console.log("- pageResults here:",pageResults);
    return pageResults;

}

async function extractProductInformation(pageResults,jsonResult){
    //console.log("- extractProductInformation pageResult:",pageResults);
    // JSSoup !https://github.com/chishui/JSSoup
    for (var item of pageResults){

        //Find the 'a' tag of the item
        h2_tag_item = item.find("h2");
        a_tag_item = h2_tag_item.find('a');
        // Name of the item
        description = a_tag_item.getText();
        //console.log("- description:",description);

        //Get the url of the item
        category_url = WEB_URL + a_tag_item.attrs.href;
        //console.log("- category_url:",category_url);

        //Get the price of the product
        try{
            product_price_location = item.find('span', 'a-price');
            product_price = product_price_location.find('span', 'a-offscreen').getText().replace(/\&nbsp;/g, '');
        }catch(attributeError){
            product_price = "N/A";
        }
        //Get product reviews
        try{
            product_review = item.find('i').getText().trim();
        }catch(attributeError){
            product_review = "N/A";
        }

        // Get number of reviews
        try{
            review_number = item.find('span', {'class': 'a-size-base'}).getText();
        }catch(attributeError){
            review_number = "N/A";
        }

        // Store the product information in a tuple
        var result = {
            description : description,
            product_price: product_price,
            product_review: product_review,
            review_number: review_number,
            category_url: category_url
        };

        // Store the information in a temporary record
        //console.log("- pushing result ");
        jsonResult.push(result);
    }
    console.log("- return results jsons ");
    return jsonResult;
}

async function amazonScraper(value){

    var webdriver = require("selenium-webdriver");
    var chrome = require("selenium-webdriver/chrome");

    var options = new chrome.Options();

    // needed for heroku
    options.setChromeBinaryPath(process.env.CHROME_BINARY_PATH);
    let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH);

    //const proxy = "185.89.180.151:4145";

    options.addArguments(["--disable-infobars"]);
    options.addArguments(["--disable-gpu"]);
    options.addArguments(["--disable-extensions"]);
    options.addArguments(["--log-level=OFF"]);
    options.addArguments(["--headless"]);
    options.addArguments(["--log-level=1"]);
    options.addArguments(["--no-sandbox"]);
    options.addArguments(["--disable-dev-shm-usage"]);
    //options.addArguments(["--disable-features=NetworkService"]);
    //options.addArguments(["--disable-features=VizDisplayCompositor"]);
    //options.addArguments(["--window-size=1920x1080"]);
    //options.addArguments(["ignore-certificate-errors"]);
    //options.addArguments(["--proxy-server=socks4://"+proxy]);

    driver = new webdriver.Builder()
             .forBrowser("chrome")
             .setChromeOptions(options)
             .setChromeService(serviceBuilder) // needed for heroku
             .build();

    await driver.get("https://www.amazon.it/");

    title = await driver.getTitle();
    console.log("- title:",title);
    categoryUrl = await getCategoryUrl(value);
    await driver.get(categoryUrl);

    var jsonResult = {};
    jsonResult["Results"]=[];

    // first page
    pageResults = await extractWebpageInformation(driver);
    jsonResult["Results"] = await extractProductInformation(pageResults,jsonResult["Results"]);

    // next pages
    //await navigateToOtherPages(driver,await getCategoryUrl(value),jsonResult["Results"]);
    await driver.close();
    await driver.quit();
    return jsonResult;
}
