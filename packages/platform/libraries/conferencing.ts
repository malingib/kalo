export {
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
  getAllTranscriptsAccessLinkFromRoomName,
  getCalVideoMeetingSessionsByRoomName,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "@kalo/features/conferencing/lib/videoClient";

export { FAKE_DAILY_CREDENTIAL } from "@kalo/app-store/dailyvideo/lib/VideoApiAdapter";

export type { CalMeetingParticipant, CalMeetingSession } from "@kalo/app-store/dailyvideo/zod";
