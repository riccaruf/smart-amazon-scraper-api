FROM node:12.19 as development
WORKDIR /usr/src/app
COPY package*.json ./
RUN apt-get update -q
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install -yqq ./google-chrome-stable_current_amd64.deb
RUN npm install
RUN npm install request --save
RUN apt-get install -yqq unzip curl
RUN wget -O /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/`curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE`/chromedriver_linux64.zip
RUN unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/
COPY . .
RUN chmod 775 /usr/src/app
EXPOSE 5000
CMD ["node", "index.js"]

