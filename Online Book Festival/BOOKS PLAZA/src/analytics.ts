import ReactGA from "react-ga4";

export const initGA = () => {
  ReactGA.initialize("G-WEN8GHTOY1"); // Replace with your Measurement ID
};

export const logPageView = () => {
  ReactGA.send("pageview");
};

export const logEvent = (category: string, action: string, label?: string) => {
  ReactGA.event({ category, action, label });
};
