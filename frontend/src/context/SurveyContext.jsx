import { createContext, useContext, useState } from "react";

const SurveyContext = createContext(null);

export function SurveyProvider({ children }) {
  const [activeSurvey, setActiveSurveyState] = useState(() => {
    const stored = sessionStorage.getItem("cg_survey");
    return stored ? JSON.parse(stored) : null;
  });

  function setActiveSurvey(survey) {
    sessionStorage.setItem("cg_survey", JSON.stringify(survey));
    setActiveSurveyState(survey);
  }

  return (
    <SurveyContext.Provider value={{ activeSurvey, setActiveSurvey }}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("useSurvey must be used inside <SurveyProvider>");
  return ctx;
}
