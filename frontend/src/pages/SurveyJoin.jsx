import { useState } from 'react';
import NavigationSidebar from '../components/NavigationSidebar';

const PAGE_NAME = "survey-join"
export default function SurveyJoin() {
  
  const [activePage, setActivePage] = useState('survey-join');
  return (
    <div style={{ display: 'flex' }}>
      <NavigationSidebar
          activeId={activePage}
          onNavigate={(id) => setActivePage(id)}
      />
      <main style={{ padding: "3rem 2rem", textAlign: "center", color: "#555" }}>
        <h2>Join a survey</h2>
      </main>
    </div>
    
  );
}
