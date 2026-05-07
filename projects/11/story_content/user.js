window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script1 = function()
{
  const player = GetPlayer();
const userText = player.GetVar("UserResponse");

// Reset the completion flag so Storyline knows we are processing
player.SetVar("s_api_complete", false);

if (window.aiController) window.aiController.abort();
window.aiController = new AbortController();
const signal = window.aiController.signal;

async function getSecureFeedback() {
    try {
        console.log("Starting analysis...");
        const response = await fetch("https://empathyslproject.onrender.com/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userText: userText }),
            signal: signal
        });

        const data = await response.json();
        console.log("Data Received:", data);

// 1. Map Scores
        function getNumericScore(key) {
            let val = data[key.toLowerCase()] || data[key] || 0;
            let num = parseInt(val.toString().replace(/[^0-9]/g, ''));
            return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 10);
        }

        const scorePrecision = getNumericScore("precision");
        const scorePolish = getNumericScore("polish");
        const scoreWarmth = getNumericScore("warmth");
        const scoreFlow = getNumericScore("flow");
        const scoreImpact = getNumericScore("impact");

        player.SetVar("s_precision", scorePrecision);
        player.SetVar("s_polish", scorePolish);
        player.SetVar("s_warmth", scoreWarmth);
        player.SetVar("s_flow", scoreFlow);
        player.SetVar("s_impact", scoreImpact);

        // --- NEW: Calculate the Aggregate Score ---
        // Sum the scores and divide by 5. 
        // We multiply by 10, round, and divide by 10 to keep exactly 1 decimal place (e.g., 7.4)
        const totalSum = scorePrecision + scorePolish + scoreWarmth + scoreFlow + scoreImpact;
        const aggregateScore = Math.round((totalSum / 5) * 10) / 10;
        
        player.SetVar("s_overall_score", aggregateScore);
        // ----------------------------------------
        
        
        // 2. Map Booleans (Flags & Content Check)
        player.SetVar("s_flag_length", data.flag_length === true);
        player.SetVar("s_flag_pii", data.flag_pii === true);
        player.SetVar("s_flag_profanity", data.flag_profanity === true);
        player.SetVar("s_content", data.content_pass === true);

        // 3. Map Text & Format Bullet Points
        player.SetVar("s_feedback", data.feedback || "");
        
        // Convert the JSON arrays into a neat bulleted list string for Storyline
        const workedText = Array.isArray(data.what_worked) ? "• " + data.what_worked.join("\n• ") : "";
        player.SetVar("s_whatworked", workedText);

        const sharpenText = Array.isArray(data.what_to_sharpen) ? "• " + data.what_to_sharpen.join("\n• ") : "";
        player.SetVar("s_whattosharpen", sharpenText);

        // 4. Signal to Storyline that the data is ready
        player.SetVar("s_api_complete", true);

    } catch (err) {
        if (err.name !== 'AbortError') console.error("Fetch Error:", err);
    } finally {
        window.aiController = null;
    }
}

getSecureFeedback();
}

window.Script2 = function()
{
  const player = GetPlayer();

// Target your specific shape on Slide 3 (make sure its accessibility text is exactly 'chartContainer')
const container = document.querySelector('[data-acc-text="chartContainer"]');

// 1. Fetch the NEW 'Snappy 5' scores from Storyline
const scores = [
    player.GetVar("s_precision") || 0,
    player.GetVar("s_polish") || 0,
    player.GetVar("s_warmth") || 0,
    player.GetVar("s_flow") || 0,
    player.GetVar("s_impact") || 0
];

console.log("Drawing Graph with scores:", scores);

// 2. Your NEW Geometry (from the Word document)
const centerX = 842;
const centerY = 332;
const maxR = 142; // (332 - 190)

// 3. Create the SVG (scaled to your slide dimensions)
if (!document.getElementById('aiRadarGraph')) {
    container.innerHTML = `
        <svg id="aiRadarGraph" viewBox="0 0 1080 608" 
             style="width:1080px; height:608px; position:absolute; top:0; left:0; overflow:visible; pointer-events:none;">
            <!-- Start the polygon as a tiny dot in the new centre -->
            <polygon id="scoreWeb" points="842,332 842,332 842,332 842,332 842,332" 
                     fill="rgba(0, 255, 204, 0.4)" stroke="#00FFCC" stroke-width="3"/>
        </svg>`;
}

// 4. Calculate the 5 points
let points = scores.map((val, i) => {
    // 72 degrees per slice, starting at the top (-90 degrees)
    let angle = (Math.PI * 2 / 5) * i - (Math.PI / 2);
    let r = (val / 10) * maxR;
    
    // Safety check to prevent SVG breaking on a zero score
    if (val === 0) r = 0; 
    
    return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
}).join(" ");

// 5. Animate with GSAP
gsap.to("#scoreWeb", {
    duration: 1.5,
    attr: { points: points },
    ease: "back.out(1.7)"
});
}

};
