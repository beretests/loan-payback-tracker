export function connectionLabel(channelStatus, online = true) {
  if (!online) return "Offline";
  if (channelStatus === "SUBSCRIBED") return "Live";
  return "Reconnecting";
}
