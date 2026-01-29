const env=require("dotenv").config();

export const socket = new WebSocket(`ws://localhost:${env.parsed.PORT}`);
