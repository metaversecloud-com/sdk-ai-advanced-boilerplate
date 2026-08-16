import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import GlobalProvider from "./context/GlobalProvider";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </GlobalProvider>,
);
