/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    PROCESS_NAME: string;
    LISTEN_PORT: string;
    INTERVAL_TIME: string;
    MAILER_ENABLED: string;
    MAILER_SERVICE: string;
    MAILER_USERNAME: string;
    MAILER_PASSWORD: string;
    MAILER_TITLE: string;
    MAILER_RECEIVER_EMAIL: string;
    MESSENGER_ENABLED: string;
    MESSENGER_API_URL: string;
    COURT_VIEW_URL: string;
    COURT_RESERVATION_URL: string;
    COURT_TYPE: string;
    COURT_FLAGS: string;
    HOLIDAY_API_URL: string;
    HOLIDAY_API_SERVICE_KEY: string;
  }
}
