/* SECOND CHANCE MK7 — presentation, campaign order and orbital diagram refinements.
   The existing MK6 engineering/gameplay systems remain the source of game state. */
const mk7CssLink = document.createElement('link');
mk7CssLink.rel = 'stylesheet';
mk7CssLink.href = 'mk7.css';
document.head.appendChild(mk7CssLink);

// The trajectory screen remains Month 0, but engineering decisions now happen before launch gameplay.
const mk7TrajectoryCommit = document.getElementById('trajCommit');
mk7TrajectoryCommit.onclick = () => {
  const d = selectedTraj();
  window.phoenixTrajectory = {...d};
  trajectory.classList.remove('visible');
  playState.trajectory = d.id;
  playState.payload = d.payload;
  playState.monthlyExtra = d.id === 'heavy' ? 0.4 : 0;
  playState.scheduleSlip = d.id === 'heavy' ? 1 : 0;
  playState.hiddenTrajectoryRisk = {...d.hiddenRisk};
  playState.science = (playState.science || 0) + d.science;
  showPage('engineering');
  const firstOpen = locked.findIndex(v => v < 0);
  setDepartment(firstOpen < 0 ? 0 : firstOpen);
  toast('Trajectory committed · complete engineering design before launch');
};

// Keep the original screen geography: department icon rail LEFT, Mars scene CENTRE,
// active engineering decisions RIGHT. No swapping of the two side panels.
const mk7GameFrame = document.querySelector('.game-frame');
mk7GameFrame.style.gridTemplateColumns = '78px minmax(0,1fr) minmax(360px,405px)';
const mk7Menu = document.querySelector('.command-menu');
const mk7Design = document.querySelector('.design-sidebar');
mk7Menu.style.order = '0';
mk7Design.style.order = '2';

// Reduce decision-card copy without hiding the full explanation: hover/focus reveals it in a tooltip.
const mk7ChoiceObserver = new MutationObserver(() => {
  document.querySelectorAll('#choices .choice').forEach(choice => {
    if (choice.dataset.mk7Compact) return;
    choice.dataset.mk7Compact = '1';
    const heading = choice.querySelector('h4');
    const description = choice.querySelector('p');
    const full = [heading?.textContent, description?.textContent].filter(Boolean).join(' — ');
    if (full) {
      choice.title = full;
      choice.setAttribute('aria-label', full);
    }
  });
});
mk7ChoiceObserver.observe(document.getElementById('choices'), {childList:true,subtree:true});

// Swap the simplified Earth-to-Mars jump for two full planetary orbits and a transfer ellipse.
const mk7OrbitSvg = `
<svg viewBox="0 0 760 500" role="img" aria-label="Sun-centred orbital diagram showing Earth's circular orbit, Mars's circular orbit and an elliptical transfer trajectory">
 <defs>
  <radialGradient id="mk7SunGlow"><stop stop-color="#fff2bd"/><stop offset=".45" stop-color="#f2c66d"/><stop offset="1" stop-color="#d88d3c"/></radialGradient>
  <filter id="mk7Glow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <marker id="mk7Arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#f2c66d"/></marker>
 </defs>
 <g class="mk7-stars">
  <circle cx="58" cy="62" r="1.6"/><circle cx="121" cy="400" r="1"/><circle cx="194" cy="86" r="1.4"/><circle cx="642" cy="68" r="1.4"/><circle cx="690" cy="391" r="1.2"/><circle cx="580" cy="438" r="1"/><circle cx="350" cy="48" r="1.3"/><circle cx="720" cy="210" r="1.4"/><circle cx="86" cy="255" r="1.2"/>
 </g>
 <g class="orbit-rings">
  <circle cx="380" cy="250" r="100"/>
  <circle cx="380" cy="250" r="190"/>
 </g>
 <circle class="sun-core" cx="380" cy="250" r="17" filter="url(#mk7Glow)"/>
 <text x="400" y="254">SUN</text>
 <!-- Earth at departure point; Mars shown at its launch-window lead angle. -->
 <circle class="earth-dot" cx="280" cy="250" r="9"/>
 <text x="246" y="276">EARTH</text>
 <circle class="mars-dot" cx="250.1" cy="119.9" r="11"/>
 <text x="212" y="101">MARS · NOW</text>
 <circle cx="570" cy="250" r="13" fill="none" stroke="#e97855" stroke-width="1.5" stroke-dasharray="3 4" opacity=".9"/>
 <text x="578" y="244">MARS · ARRIVAL</text>
 <!-- Half-ellipse transfer arc: perihelion at Earth's orbit, aphelion at Mars's orbit. -->
 <path id="transferPath" class="transfer-path" d="M280 250 C280 174 345 112 425 112 C505 112 570 174 570 250" marker-end="url(#mk7Arrow)"/>
 <path class="transfer-guide" d="M280 250 C280 174 345 112 425 112 C505 112 570 174 570 250"/>
 <g class="traj-craft" id="mk7OrbitCraft">
  <path d="M-15 0 L-5 -5 L8 0 L-5 5 Z" fill="#f2c66d" stroke="#fff1c5" stroke-width="1.5"/>
  <path d="M-3 -4 L-8 -12 L2 -6 M-3 4 L-8 12 L2 6" fill="#45d6c4" stroke="#d6fff8" stroke-width="1"/>
  <circle cx="0" cy="0" r="2" fill="#fff"/>
  <animateMotion id="mk7Motion" dur="8s" repeatCount="indefinite" rotate="auto" path="M280 250 C280 174 345 112 425 112 C505 112 570 174 570 250"/>
 </g>
 <g class="traj-labels">
  <text x="252" y="315">LAUNCH</text>
  <text x="399" y="92">CRUISE</text>
  <text x="560" y="315">ARRIVAL</text>
  <text x="390" y="360" id="leadAngle">MARS LEAD ANGLE · ~44°</text>
  <text x="390" y="380" class="orbit-caption">SUN-CENTRED TRANSFER ORBIT · SCHEMATIC</text>
 </g>
 <path d="M280 250 L280 235 M570 250 L570 235" stroke="#45d6c4" stroke-width="1.5" stroke-dasharray="3 3"/>
</svg>`;
document.getElementById('trajDiagram').insertAdjacentHTML('afterbegin', '<div class="mk7-orbit-wrap"></div>');
document.querySelector('.mk7-orbit-wrap').innerHTML = mk7OrbitSvg;
// Hide the former SVG while preserving the diagram shell and caption.
const oldOrbitSvg = [...document.querySelectorAll('#trajDiagram > svg')].find(svg => !svg.closest('.mk7-orbit-wrap'));
if (oldOrbitSvg) oldOrbitSvg.remove();

const mk7RenderTrajectoryBase = renderTrajectory;
renderTrajectory = function(){
  mk7RenderTrajectoryBase();
  const d = selectedTraj();
  const path = d.id === 'fast'
    ? 'M280 250 C292 185 385 85 570 250'
    : 'M280 250 C280 174 345 112 425 112 C505 112 570 174 570 250';
  const orbitPath = document.querySelector('.mk7-orbit-wrap #transferPath');
  const motion = document.getElementById('mk7Motion');
  if (orbitPath) orbitPath.setAttribute('d', path);
  if (motion) motion.setAttribute('path', path);
  const craft = document.getElementById('mk7OrbitCraft');
  if (craft) craft.classList.toggle('heavy-craft', d.id === 'heavy');
  const lead = document.querySelector('.mk7-orbit-wrap #leadAngle');
  if (lead) lead.textContent = 'MARS LEAD ANGLE · ~44°';
};

// The engineering review is the gate to the actual flight. Start at the Earth launch facility only after design.
document.getElementById('playCampaign').onclick = () => {
  showPlay();
  setPlayStage('brief');
  el('playTitle').textContent = 'EARTH LAUNCH FACILITY · MONTH 00';
  el('playText').textContent = 'Engineering design approved for flight review. Your spacecraft is on the launch pad. Complete the five pre-flight checks, then begin the countdown.';
  el('playTelemetry').textContent = 'TRAJECTORY ' + (window.phoenixTrajectory?.label || 'STANDARD') + ' · PAYLOAD ' + (window.phoenixTrajectory?.payload || 10) + ' UNITS · WINDOW MONTH 12';
  el('playAction').textContent = 'COMPLETE FLIGHT READINESS CHECKS';
};

// Keep the campaign's side panels in their familiar positions even when CSS is reflowed.
const mk7Responsive = document.createElement('style');
mk7Responsive.textContent = `
@media(min-width:761px){.game-frame{display:grid!important;grid-template-columns:78px minmax(0,1fr) minmax(360px,405px)!important}.command-menu{grid-column:1!important;grid-row:1!important}.mission-scene{grid-column:2!important;grid-row:1!important}.design-sidebar{grid-column:3!important;grid-row:1!important}}
.mk7-orbit-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1}
.mk7-orbit-wrap svg{width:100%;height:100%;max-height:540px}
.mk7-stars circle{fill:#d5f8f3;opacity:.75}
.transfer-guide{fill:none;stroke:#e97855;stroke-width:1;stroke-dasharray:2 9;opacity:.35}
.transfer-path{fill:none;stroke:#f2c66d;stroke-width:3.5;stroke-dasharray:8 7;animation:pathDash 2s linear infinite}
.traj-craft{filter:drop-shadow(0 0 5px #f2c66d99)}
.traj-craft.heavy-craft{transform:scale(1.5)}
.orbit-caption{font-size:8px!important;fill:#9abbb8!important}
.traj-diagram>.traj-caption{z-index:2}
.traj-diagram>#trajCompareTable{z-index:3}
#choices .choice{transition:background .16s,border-color .16s,transform .16s}
#choices .choice:hover,#choices .choice:focus-visible{transform:translateX(-2px);border-color:var(--mk6-cyan)!important;background:#15505a!important}
@media(max-width:760px){.mk7-orbit-wrap svg{min-height:280px}}
`;
document.head.appendChild(mk7Responsive);

// Selecting the Mars campaign now follows the same story → trajectory → engineering route.
document.getElementById('selectMars').onclick = () => {
  resetState();
  showIntro();
};
