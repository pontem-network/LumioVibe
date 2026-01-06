import "./logo.css";
import bLogo from "#/assets/logo.png";

export function Logo() {
  const subText = ["CREATE", "WEB3 APPS", "WITH JUST A PROMPT"];
  const desc = [
    "TYPE",
    " a prompt, get production-ready smart contracts instantly. No coding required.",
  ];

  return (
    <div className="main-logo">
      <div className="logo">
        <img src={bLogo} alt="B" />
        UILD
      </div>
      <div className="subtext">
        {subText[0]}
        <b> {subText[1]} </b>
        {subText[2]}
      </div>
      <div className="desc">
        <span>{desc[0]}</span>
        {desc[1]}
      </div>
    </div>
  );
}
