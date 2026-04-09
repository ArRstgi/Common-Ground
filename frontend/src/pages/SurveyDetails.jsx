export default function SurveyDetails({ surveyInfo }) {
    return (
        <main style={{ padding: "3rem 2rem", textAlign: "center", color: "#555" }}>
            <h2>Survey Details</h2>
            {{ surveyInfo }}
        </main>
    );
}
