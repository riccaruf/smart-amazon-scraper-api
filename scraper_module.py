import os
import time
import sys
from datetime import date
import csv
from bs4 import BeautifulSoup
from numpy import record
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchElementException
import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service

"""
    Step1: Open the browser
    Step2: Search for the product
    Step3: Extract the html content of all the products
    Step4: Extract the product description, price, ratings, reviews count and URL
    Step5: Record the product information in a product record list
    Step6: Repeat for all the pages
    Step7: Close the browser
    Step8: Write all the product's information in the product record list in the spreadsheet
"""
WEB_URL = "https://www.amazon.it/"

class AmazonProductScraper:
    def __init__(self):
        self.driver = None
        self.category_name = None
        self.formatted_category_name = None

    def open_browser(self):

        opt = Options()

        opt.add_argument("--disable-infobars")
        opt.add_argument("--disable-extensions")
        opt.add_argument('--log-level=OFF')
        opt.add_argument('--headless')
        opt.add_argument('--log-level=1')
        #opt.add_experimental_option('excludeSwitches', ['enable-logging'])

        #self.driver = webdriver.Chrome(ChromeDriverManager().install(), chrome_options=opt)
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()),options=opt)
        # Website URL
        self.driver.get(WEB_URL)

        # Wait till the page has been loaded
        time.sleep(1)

    def get_category_url(self):

        self.category_name = sys.argv[1]
        #print("- self.category_name:",self.category_name)
        self.formatted_category_name = self.category_name.replace(" ", "+")

        # This is the product url format for all products
        category_url = WEB_URL+"s?k={}&ref=nb_sb_noss"

        category_url = category_url.format(self.formatted_category_name)

        print('{ "CategoryURL":"'+category_url+'",')

        # Go to the product webpage
        self.driver.get(category_url)
        # To be used later while navigating to different pages
        return category_url

    def extract_webpage_information(self):
        # Parsing through the webpage
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        # List of all the html information related to the product
        page_results = soup.find_all('div', {'data-component-type': 's-search-result'})

        return page_results

    @staticmethod
    def extract_product_information(page_results):
        temp_record = []
        for i in range(len(page_results)):
            item = page_results[i]

            # Find the 'a' tag of the item
            a_tag_item = item.h2.a

            # Name of the item
            description = a_tag_item.text.strip()

            # Get the url of the item
            category_url = WEB_URL + a_tag_item.get('href')

            # Get the price of the product
            try:
                product_price_location = item.find('span', 'a-price')
                product_price = product_price_location.find('span', 'a-offscreen').text
            except AttributeError:
                product_price = "N/A"

            # Get product reviews
            try:
                product_review = item.i.text.strip()
            except AttributeError:
                product_review = "N/A"

            # Get number of reviews
            try:
                review_number = item.find('span', {'class': 'a-size-base'}).text
            except AttributeError:
                review_number = "N/A"

            # Store the product information in a tuple
            product_information = (description, product_price[1:], product_review, review_number, category_url)

            # Store the information in a temporary record
            temp_record.append(product_information)

        return temp_record

    def navigate_to_other_pages(self, category_url):
        # Contains the list of all the product's information
        records = []

        #print("\n>> Page 1 - webpage information extracted")

        try:

            max_number_of_pages = "//span[@class='s-pagination-item s-pagination-disabled']"
            number_of_pages = self.driver.find_element(by=By.XPATH, value=max_number_of_pages)

        except NoSuchElementException:
            max_number_of_pages = "//li[@class='a-normal'][last()]"
            number_of_pages = self.driver.find_element(by=By.XPATH, value=max_number_of_pages)

        nop = int(number_of_pages.text)


        if (nop > 2):
            #print ("- nop is too big :",nop)
            nop = 2

        for i in range(2, nop + 1):
            # Goes to next page
            next_page_url = category_url + "&page=" + str(i)
            self.driver.get(next_page_url)

            # Webpage information is stored in page_results
            page_results = self.extract_webpage_information()
            temp_record = self.extract_product_information(page_results)

            extraction_information = ">> Page {} - webpage information extracted"
            #print("'Extraction_information':"+extraction_information.format(i)+"',")

            for j in temp_record:
                records.append(j)

        self.driver.close()

        #print("\n>> Creating an excel sheet and entering the details...")

        return records

    def product_information_spreadsheet(self, records):

        today = date.today().strftime("%d-%m-%Y")
        file_name = "./csvfolder/{}_{}.csv".format(self.category_name, today)
        json_file_name = "./jsonfolder/{}_{}.json".format(self.category_name, today)
        for _ in records:
            f = open(file_name, "w", newline='', encoding='utf-8')
            writer = csv.writer(f)
            writer.writerow(['Description', 'Price', 'Rating', 'Review Count', 'Product URL'])
            writer.writerows(records)
            f.close()

        #os.startfile(file_name)
        if (os.path.exists(file_name)):
            df = pd.read_csv (file_name,sep = ",", header = 0, index_col = False)
            df.to_json (json_file_name,orient = "records", date_format = "epoch", double_precision = 10, force_ascii = True, date_unit = "ms", default_handler = None)
            print(json_file_name)
            os.remove(file_name)

if __name__ == "__main__":
    my_amazon_bot = AmazonProductScraper()
    my_amazon_bot.open_browser()
    category_details = my_amazon_bot.get_category_url()
    my_amazon_bot.extract_product_information(my_amazon_bot.extract_webpage_information())
    navigation = my_amazon_bot.navigate_to_other_pages(category_details)
    my_amazon_bot.product_information_spreadsheet(navigation)