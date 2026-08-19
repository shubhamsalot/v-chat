import { NextResponse } from "next/server";

export async function GET() {
  const iceServers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];

  // Optional coturn dynamically generated ephemeral credentials if TURN_SECRET is configured
  const turnSecret = process.env.TURN_SECRET;
  const turnHost = process.env.TURN_HOST || "turn.v-chat.app";

  if (turnSecret) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:vchatuser`;
    // HMAC-SHA1 calculation for coturn ephemeral credentials
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha1", turnSecret);
    hmac.update(username);
    const credential = hmac.digest("base64");

    iceServers.push({
      urls: [`turn:${turnHost}:3478?transport=udp`, `turn:${turnHost}:3478?transport=tcp`],
      username,
      credential,
    });
  }

  return NextResponse.json({ iceServers });
}
