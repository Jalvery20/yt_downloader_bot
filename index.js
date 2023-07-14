require("dotenv").config();
const express = require("express");
const app = express();
const fs= require("fs")
app.use(express.json());
const TelegramBot = require("node-telegram-bot-api");
const ytdl = require("ytdl-core");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Function to download a YouTube video and send it as a video file
async function downloadVideo(chatId, url) {
  console.log("object")
  try {
    // Get video information and thumbnail URL
    const videoInfo = await ytdl.getInfo(url);
    const title = videoInfo.player_response.videoDetails.title;
    const thumbnailUrl =
      videoInfo.videoDetails.thumbnails[
        videoInfo.videoDetails.thumbnails.length - 1
      ].url;
      console.log(title)
    // Send a message to show the download progress
    const message = await bot.sendMessage(
      chatId,
      `*Downloading video:* ${title}`
    );

    // Create a writable stream to store the video file
    const writeStream = fs.createWriteStream(`${title}-${chatId}.mp4`);

    // Start the download and pipe the video data to the writable stream
    ytdl(url, { filter: "audioandvideo" }).pipe(writeStream);

    // Set up an interval to update the message with the download progress every 5 seconds
    let progress = 0;
    const updateInterval = setInterval(() => {
      progress = writeStream.bytesWritten / (1024 * 1024);

      bot.editMessageText(
        `*Downloading video:* ${title} (${progress.toFixed(2)} MB) \u{1F4E6} - In progress`,
        {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: "Markdown", // use Markdown formatting
        }
      );
    }, 10000);

    // When the download is complete, send the video and delete the file
    writeStream.on("finish", () => {
      clearInterval(updateInterval); // stop updating the message
      bot
        .sendVideo(chatId, `${title}-${chatId}.mp4`, {
          caption: `*Video downloaded:* ${title} by Jalvery20`,
          thumb: thumbnailUrl,
          duration: videoInfo.videoDetails.lengthSeconds,
          parse_mode: "Markdown",
        })
        .then(() => {
          fs.unlinkSync(`${title}-${chatId}.mp4`); // delete the file
        })
        .catch((error) => {
          bot.sendMessage(chatId, "Error sending video.");
          console.error(error);
        });
    });
  } catch (error) {
    bot.sendMessage(chatId, "Error downloading video.");
    console.error(error);
  }
}

bot.on("message",async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  
  if (messageText.includes("youtube.com/watch?v=")) {

    const url = messageText;
   
    if (ytdl.validateURL(url)) {
      downloadVideo(chatId, url);
    } else {
      bot.sendMessage(chatId, "Invalid YouTube URL.");
    }
  } else {
    bot.sendMessage(chatId, "Invalid YouTube URL.");
  }
})

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Send a message with the introduction and instructions
  bot.sendMessage(
    chatId,
    `Hey, I am Youtube Downloader bot made by @Jalvery20. Send me a Youtube URL and i get the video for you!`
  );
});

app.listen(process.env.PORT||5000, () => {
  console.log(`Listening for youtube URL link`);
});