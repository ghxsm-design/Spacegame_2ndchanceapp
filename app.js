/* SECOND CHANCE MK7
 * One campaign state drives engineering, flight operations and the review board.
 * All numbers are deliberate game-scaled values, not mission specifications. */
(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fmt = (value) => Math.round(value).toLocaleString();
  const icons = ['✦', '⌂', '↗', '◉', '⬡', '⚙', '⌁', '▤', 'ϟ'];

  const BASELINE = Object.freeze({
    mass: 720, budget: 320, powerDemand: 130, availablePower: 280,
    science: 55, reliability: 70, schedule: 12
  });
  const LIMITS = Object.freeze({ mass: 1000, budget: 500 });
  const TRAJECTORIES = Object.freeze({
    fast: {
      id: 'fast', label: 'FAST', cruise: '~6 game months', payload: 6,
      cost: 1, schedule: 1, science: 1, hiddenRisk: { aeroshell: 10, avionics: 5 },
      summary: 'Shorter cruise, tight payload margin and a higher-energy arrival.',
      note: 'A game-scaled fast educational path; it is not a flight solution.'
    },
    standard: {
      id: 'standard', label: 'STANDARD', cruise: '~8.5 game months', payload: 10,
      cost: 0, schedule: 0, science: 0, hiddenRisk: {},
      summary: 'Balanced reference transfer using the schematic transfer ellipse.',
      note: 'A game-scaled Hohmann-style educational representation.'
    },
    heavy: {
      id: 'heavy', label: 'HEAVY LIFT', cruise: '~8.5 game months', payload: 13,
      cost: 4.8, schedule: 1, science: 0, hiddenRisk: { integration: 4 },
      summary: 'Reference transfer geometry with a larger launch vehicle and more payload.',
      note: '$0.4M per game month × 12 months; fictional balancing value.'
    }
  });

  const departments = [
    'MISSION STRATEGY', 'MISSION ARCHITECTURE', 'ROVER DEPLOYMENT',
    'LANDING SAFETY', 'STRUCTURAL DESIGN', 'FAULT MANAGEMENT', 'COMMUNICATIONS',
    'DATA MANAGEMENT', 'POWER ARCHITECTURE'
  ];

  /* Effects use the pre-limit engineering model. Limits are checked only after
     every saved decision and the committed trajectory are recalculated. */
  const DECISIONS = [
    {
      cat: 'MISSION STRATEGY', question: 'What should this mission optimise for?',
      description: 'Choose the balance that guides later engineering trade-offs.',
      options: [
        { name: 'Science-first', description: 'Maximise instruments and observations; reserves become tighter.', effects: { mass: 35, budget: 35, power: 55, science: 18, reliability: -5 }, risks: ['Science equipment raises mass and operating demand.', 'Less margin remains for redundancy and reserves.'], mitigations: ['Protect thermal, computing and communications power.', 'Use a strict mass allocation for every instrument.'] },
        { name: 'Reliability-first', description: 'Keep the design conservative; use camera survey and omit the heavier spectroscopy suite.', effects: { mass: -25, budget: 25, power: -20, science: -8, reliability: 12 }, risks: ['Science return is limited to camera-supported sample survey.', 'Qualification effort costs schedule and funding.'], mitigations: ['Keep the robotic arm and camera available for core sample collection.', 'Use risk-based verification.'] },
        { name: 'Balanced reliability & science', description: 'Protect the landing while retaining useful science.', effects: { mass: 0, budget: 0, power: 0, science: 8, reliability: 5 }, risks: ['Resource trade-offs remain difficult as systems mature.'], mitigations: ['Set minimum landing and science thresholds.'] }
      ]
    },
    {
      cat: 'MISSION ARCHITECTURE', question: 'What should explore the Martian surface?',
      description: 'The architecture determines what can be explored and what must work together.',
      options: [
        { name: 'Stationary lander', description: 'Lower risk, but cannot meet this campaign’s mandatory rover and remote sample objectives.', effects: { mass: -90, budget: -45, power: -45, science: -12, reliability: 9 }, risks: ['Science is restricted to the landing footprint.'], mitigations: ['Choose a representative site.'] },
        { name: 'Lander + small rover', description: 'Explore beyond the landing site with added deployment complexity.', effects: { mass: 95, budget: 65, power: 75, science: 18, reliability: -7 }, risks: ['Deployment becomes mission-critical.', 'Mobility draws power and needs thermal control.'], mitigations: ['Keep lander science independent.', 'Verify rover deployment interfaces.'] },
        { name: 'Mobile lander', description: 'Move the platform itself; highest mechanical challenge.', effects: { mass: 160, budget: 105, power: 105, science: 22, reliability: -15 }, risks: ['Mobility adds mass and mechanical complexity.'], mitigations: ['Limit traverses to characterised terrain.'] }
      ]
    },
    {
      cat: 'ROVER DEPLOYMENT', question: 'How should the rover reach the surface?',
      description: 'The rover must deploy without compromising the lander.',
      options: [
        { name: 'Rear ramp deployment', description: 'Familiar mechanism; clearance and terrain matter.', effects: { mass: 18, budget: 12, power: 8, science: 0, reliability: 1 }, risks: ['Uneven terrain can make the ramp unsuitable.'], mitigations: ['Verify clearance and traction.'] },
        { name: 'Suspended deployment', description: 'Controlled lowering, with release hardware to verify.', effects: { mass: 35, budget: 28, power: 22, science: 3, reliability: -4 }, risks: ['Release hardware can jam or misorient the rover.'], mitigations: ['Use independent state sensing.'] },
        { name: 'Integrated drop-off', description: 'Fewer steps, but placement and impact are less controlled.', effects: { mass: 8, budget: 8, power: 4, science: -2, reliability: -7 }, risks: ['Impact or bounce can damage the rover.'], mitigations: ['Verify release dynamics and health checks.'] }
      ]
    },
    {
      cat: 'LANDING SAFETY', question: 'How should the lander confirm touchdown?',
      description: 'The original loss was never conclusively explained; false touchdown logic was a leading hypothesis.',
      options: [
        { name: 'Single-sensor detection', description: 'Simple, but vulnerable to misleading signals.', effects: { mass: -3, budget: -5, power: -2, science: 0, reliability: -14 }, risks: ['One sensor becomes a single point of failure.'], mitigations: ['Add plausibility checks.'] },
        { name: 'Multiple independent indicators', description: 'Compare evidence before declaring touchdown.', effects: { mass: 8, budget: 12, power: 5, science: 0, reliability: 10 }, risks: ['Indicators may disagree or share vulnerabilities.'], mitigations: ['Define safe disagreement handling.'] },
        { name: 'Sensor + software validation', description: 'Validate sensor evidence against expected conditions.', effects: { mass: 3, budget: 18, power: 3, science: 0, reliability: 12 }, risks: ['Software assumptions need careful verification.'], mitigations: ['Test timing and fault-injection cases.'] }
      ]
    },
    {
      cat: 'STRUCTURAL DESIGN', question: 'How much landing protection should the lander carry?',
      description: 'Protection helps landing loads but competes with science payload.',
      options: [
        { name: 'Maximum protection + airbags', description: 'Highest protection, consuming a dedicated airbag allocation.', effects: { mass: 65, budget: 42, power: 0, science: -4, reliability: 9 }, risks: ['Structural mass can consume payload margin.'], mitigations: ['Optimise against analysed load cases.'] },
        { name: 'Balanced protection', description: 'Reinforce expected loads while retaining payload capacity.', effects: { mass: 25, budget: 20, power: 0, science: 2, reliability: 6 }, risks: ['Depends on realistic landing-load assumptions.'], mitigations: ['Maintain structural margins.'] },
        { name: 'Minimum-mass design', description: 'Reserve mass for science, with tighter structural margin.', effects: { mass: -35, budget: -8, power: 0, science: 7, reliability: -12 }, risks: ['Unexpected loads could exceed capability.'], mitigations: ['Do not trade below mandatory margins.'] }
      ]
    },
    {
      cat: 'FAULT MANAGEMENT', question: 'What happens if rover deployment fails?',
      description: 'The lander should retain a useful mission after a rover fault.',
      options: [
        { name: 'Lander-first fallback', description: 'Isolate the rover and preserve lander operations.', effects: { mass: 0, budget: 5, power: -8, science: 3, reliability: 10 }, risks: ['Rover objectives can be lost.'], mitigations: ['Keep lander systems independent.'] },
        { name: 'Retry deployment', description: 'Attempt bounded recovery, consuming time and energy.', effects: { mass: 0, budget: 12, power: 18, science: 5, reliability: -5 }, risks: ['Retries can worsen a mechanical fault.'], mitigations: ['Set bounded retry limits.'] },
        { name: 'Autonomous recovery', description: 'Let software select a conservative recovery action.', effects: { mass: 2, budget: 25, power: 10, science: 7, reliability: 2 }, risks: ['Fault diagnosis may choose an unsuitable action.'], mitigations: ['Use conservative fallback states.'] }
      ]
    },
    {
      cat: 'COMMUNICATIONS', question: 'How should data return to Earth?',
      description: 'The architecture controls link availability, power and redundancy.',
      options: [
        { name: 'Direct-to-Earth', description: 'A direct antenna with constrained contact periods.', effects: { mass: -12, budget: -22, power: 22, science: 0, reliability: -3 }, risks: ['The link is not always available.'], mitigations: ['Schedule contacts and buffer data.'] },
        { name: 'Orbiter relay', description: 'A relay uses less rover power but depends on a pass.', effects: { mass: 8, budget: 30, power: -5, science: 3, reliability: 5 }, risks: ['Relay windows constrain deliveries.'], mitigations: ['Retain storage for relay gaps.'] },
        { name: 'Hybrid', description: 'Relay primary with a direct-to-Earth backup.', effects: { mass: 15, budget: 48, power: 12, science: 5, reliability: 9 }, risks: ['Two radio paths add integration work.'], mitigations: ['Verify failover behaviour.'] }
      ]
    },
    {
      cat: 'DATA MANAGEMENT', question: 'How should the mission handle generated data?',
      description: 'Mars–Earth communication is intermittent in this game model.',
      options: [
        { name: 'Store and forward', description: 'Protect packets until a communications opportunity.', effects: { mass: 3, budget: 8, power: 2, science: 2, reliability: 8 }, risks: ['Storage can fill during an outage.'], mitigations: ['Budget for the longest outage.'] },
        { name: 'Transmit continuously', description: 'Send whenever possible, with a small buffer.', effects: { mass: 0, budget: 5, power: 12, science: 1, reliability: -2 }, risks: ['Interrupted links can lose unsaved data.'], mitigations: ['Use automatic retry logic.'] },
        { name: 'Prioritised transmission', description: 'Protect health and high-priority science first.', effects: { mass: 5, budget: 14, power: 5, science: 4, reliability: 7 }, risks: ['Priority logic needs verification.'], mitigations: ['Test a clear priority table.'] }
      ]
    },
    {
      cat: 'POWER ARCHITECTURE', question: 'How should limited electrical power be managed?',
      description: 'Science, mobility, radio, thermal control and computing cannot all peak together.',
      options: [
        { name: 'Science-first', description: 'Prioritise instruments, with smaller operational reserves.', effects: { mass: 10, budget: 8, power: 20, science: 9, reliability: -8 }, risks: ['Science can compete with survival loads.'], mitigations: ['Set non-negotiable survival reserves.'] },
        { name: 'Survival-first', description: 'Protect thermal, computing and communications first.', effects: { mass: 5, budget: 10, power: -15, science: -5, reliability: 10 }, risks: ['Observations can be reduced or delayed.'], mitigations: ['Use planned science windows.'] },
        { name: 'Dynamic power management', description: 'Adjust modes by battery state, temperature and health.', effects: { mass: 8, budget: 22, power: 0, science: 7, reliability: 7 }, risks: ['Complex control needs transition testing.'], mitigations: ['Define deterministic safe modes.'] }
      ]
    }
  ];

  const SITES = Object.freeze([
    { id: 'regolith', name: 'Landing Regolith', type: 'surface soil', description: 'Fine-grained material near the landing site.', x: 34, depth: 30, requires: ['roboticArm', 'camera'] },
    { id: 'basalt', name: 'Basalt Ridge', type: 'igneous fragment', description: 'Dark clast that records volcanic history.', x: 72, depth: 57, requires: ['roboticArm', 'spectrometer'] },
    { id: 'frost', name: 'Polygon Frost', type: 'subsurface ice', description: 'A shallow icy layer at a patterned-soil boundary.', x: 24, depth: 72, requires: ['roboticArm', 'drill', 'spectrometer'] }
  ]);
  const MISSION_EVENTS = Object.freeze([
    { sol: 1.3, id: 'dust', label: 'DUST BUILD-UP', message: 'A dust front coats the solar array. Generation margin falls by 20 W and the battery loses 5%.' },
    { sol: 1.55, id: 'cold', label: 'COLD NIGHT CYCLE', message: 'The surface cools. Environmental temperature drops and the rover loses 8°C; increase heater power if needed.' },
    { sol: 1.9, id: 'science', label: 'SCIENCE OPPORTUNITY', message: 'The camera identifies a new sample clue. Installed science equipment adds a survey result to the board.' },
    { sol: 2.2, id: 'terrain', label: 'ROCKY TERRAIN', message: 'A rough patch limits mobility. Existing obstacle boundaries prevent the rover crossing the outcrop.' }
  ]);

  let campaign;
  let engineeringIndex = 0;
  let engineeringPreview = null;
  let toastTimer = null;
  let orbitFrame = null;
  let communicationTimers = [];

  function newCampaign() {
    return {
      introSeen: false,
      trajectory: null,
      decisions: Array(DECISIONS.length).fill(null),
      flight: {
        phase: 'preflight', stageSep: 0, steer: 0, preflight: {}, roverX: 48,
        roverDepth: 38, battery: 100, temperature: -35, environment: -62,
        sol: 1, samples: [], collected: [], operationScience: 0,
        generationPenalty: 0, nextMissionEvent: 0,
        power: { communications: 25, science: 35, mobility: 25, heating: 30, computing: 15, standby: 10 },
        commQueue: [], receivedInstructions: ['Earth: protect systems first, then downlink science packets.'],
        communicationsDelivered: false, armBusy: false, events: [], final: null
      }
    };
  }

  function resetCampaign({ navigate = true } = {}) {
    communicationTimers.forEach((timer) => clearTimeout(timer));
    communicationTimers = [];
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    orbitFrame = null;
    campaign = newCampaign();
    engineeringIndex = 0;
    engineeringPreview = null;
    closeFlight();
    document.querySelectorAll('.flight-modal.open').forEach((modal) => modal.classList.remove('open'));
    byId('trajectoryLayer')?.classList.remove('open');
    if (navigate) showPage('missions');
    renderEngineering();
  }

  function calculateCampaign() {
    const raw = { ...BASELINE, hiddenRisk: {} };
    const trajectory = campaign.trajectory ? TRAJECTORIES[campaign.trajectory] : null;
    if (trajectory) {
      raw.budget += trajectory.cost;
      raw.schedule += trajectory.schedule;
      raw.science += trajectory.science;
      Object.entries(trajectory.hiddenRisk).forEach(([key, value]) => {
        raw.hiddenRisk[key] = (raw.hiddenRisk[key] || 0) + value;
      });
    }
    campaign.decisions.forEach((choice, department) => {
      if (choice === null) return;
      const effect = DECISIONS[department].options[choice].effects;
      raw.mass += effect.mass;
      raw.budget += effect.budget;
      raw.powerDemand += effect.power;
      raw.science += effect.science;
      raw.reliability += effect.reliability;
      if (effect.reliability < 0) raw.hiddenRisk.engineering = (raw.hiddenRisk.engineering || 0) + Math.abs(effect.reliability) / 2;
    });
    const strategy = campaign.decisions[0];
    const architecture = campaign.decisions[1];
    const comms = campaign.decisions[6];
    const power = campaign.decisions[8];
    const inventory = {
      camera: strategy !== null,
      spectrometer: strategy !== 1,
      drill: strategy === 0,
      roboticArm: architecture !== 0,
      antenna: comms !== null,
      solarPanels: power !== null,
      battery: true,
      backupBattery: power === 1 || power === 2,
      thermalInstrument: strategy === 0 || power === 2,
      rover: architecture !== null && architecture !== 0,
      sampleCapacity: strategy === 0 ? 4 : 2
    };
    if (power === 0) raw.availablePower += 15;
    if (power === 1) raw.availablePower += 10;
    if (power === 2) raw.availablePower += 20;
    const airbags = campaign.decisions[4] === 0 ? 4 : 0;
    const sciencePayload = strategy === 0 ? 4 : strategy === 1 ? 0 : strategy === null ? 0 : 2;
    const manifest = [
      { name: 'Landing legs & engines', units: 6 },
      { name: 'Airbags', units: airbags },
      { name: strategy === 0 ? 'Full science suite' : 'Basic science suite', units: sciencePayload }
    ].filter((item) => item.units > 0);
    const payloadUsed = manifest.reduce((sum, item) => sum + item.units, 0);
    return {
      mass: raw.mass, budget: raw.budget, powerDemand: Math.max(0, raw.powerDemand),
      availablePower: raw.availablePower, science: clamp(raw.science, 0, 100),
      reliability: clamp(raw.reliability, 0, 100), schedule: raw.schedule,
      hiddenRisk: Object.values(raw.hiddenRisk).reduce((sum, value) => sum + value, 0),
      hiddenRiskBreakdown: raw.hiddenRisk, payloadAllowance: trajectory?.payload ?? 0,
      payloadUsed, manifest, inventory, trajectory
    };
  }

  function knownWarnings(resources = calculateCampaign()) {
    const warnings = [];
    if (resources.mass > LIMITS.mass) warnings.push('MASS LIMIT EXCEEDED: revise structure or architecture.');
    if (resources.budget > LIMITS.budget) warnings.push('BUDGET LIMIT EXCEEDED: revise cost-driving choices.');
    if (resources.powerDemand > resources.availablePower) warnings.push('POWER DEMAND EXCEEDS AVAILABLE GENERATION.');
    if (resources.trajectory && resources.payloadUsed > resources.payloadAllowance) warnings.push(`PAYLOAD USES ${resources.payloadUsed}/${resources.payloadAllowance} UNITS.`);
    return warnings;
  }

  function engineeringChecks(resources = calculateCampaign()) {
    const checks = [];
    checks.push({ label: 'Committed trajectory', ok: Boolean(resources.trajectory), status: resources.trajectory ? 'COMPLETED' : 'INCOMPLETE', detail: resources.trajectory ? resources.trajectory.label : 'Choose FAST, STANDARD, or HEAVY LIFT.' });
    campaign.decisions.forEach((choice, index) => checks.push({
      label: `${String(index + 1).padStart(2, '0')} ${departments[index]}`,
      ok: choice !== null,
      status: choice !== null ? 'COMPLETED' : 'INCOMPLETE',
      detail: choice === null ? 'Decision not saved.' : DECISIONS[index].options[choice].name
    }));
    checks.push({ label: 'Rover architecture', ok: resources.inventory.rover, status: resources.inventory.rover ? 'COMPLETED' : 'BLOCKED', detail: resources.inventory.rover ? 'Rover mobility is installed.' : 'This campaign requires a rover. Select Lander + small rover or Mobile lander; a stationary lander cannot meet the required objectives.' });
    const sampleInstrument = resources.inventory.spectrometer || resources.inventory.camera;
    checks.push({ label: 'Sample instrument', ok: resources.inventory.roboticArm && sampleInstrument, status: resources.inventory.roboticArm && sampleInstrument ? 'COMPLETED' : 'BLOCKED', detail: resources.inventory.roboticArm && sampleInstrument ? 'Arm and at least one approved sample instrument are installed.' : 'A mobile architecture must supply the rover arm, plus an approved camera or spectrometer.' });
    const communicationsReady = resources.inventory.antenna;
    checks.push({ label: 'Communications equipment', ok: communicationsReady, status: communicationsReady ? 'COMPLETED' : 'BLOCKED', detail: communicationsReady ? 'Engineering-approved antenna is installed.' : 'Select a communications architecture.' });
    checks.push({ label: 'Payload manifest', ok: Boolean(resources.trajectory) && resources.payloadUsed <= resources.payloadAllowance, status: !resources.trajectory ? 'INCOMPLETE' : resources.payloadUsed <= resources.payloadAllowance ? 'COMPLETED' : 'BLOCKED', detail: resources.trajectory ? `${resources.payloadUsed}/${resources.payloadAllowance} game units` : 'No allowance until trajectory commitment.' });
    checks.push({ label: 'Mass limit', ok: resources.mass <= LIMITS.mass, status: resources.mass <= LIMITS.mass ? 'COMPLETED' : 'BLOCKED', detail: `${fmt(resources.mass)}/${LIMITS.mass} kg` });
    checks.push({ label: 'Budget limit', ok: resources.budget <= LIMITS.budget, status: resources.budget <= LIMITS.budget ? 'COMPLETED' : 'BLOCKED', detail: `$${resources.budget.toFixed(1)}M/$${LIMITS.budget}M` });
    checks.push({ label: 'Engineering power margin', ok: resources.powerDemand <= resources.availablePower, status: resources.powerDemand > resources.availablePower ? 'BLOCKED' : 'COMPLETED', detail: `${fmt(resources.powerDemand)}/${fmt(resources.availablePower)} W` });
    checks.push({ label: 'Reliability margin', ok: resources.reliability >= 35, status: resources.reliability < 35 ? 'BLOCKED' : resources.reliability < 50 ? 'WARNING' : 'COMPLETED', detail: `${fmt(resources.reliability)}/100 · below 50 is a board warning` });
    return checks;
  }

  function canLaunch() { return engineeringChecks().every((check) => check.ok); }

  function showPage(id) {
    document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === id));
    document.body.classList.toggle('dashboard-mode', id === 'engineering');
    document.body.classList.toggle('home-mode', id === 'home');
    document.documentElement.scrollTop = 0;
  }

  function toast(message) {
    const node = byId('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function renderEngineering() {
    if (!campaign) return;
    const resources = calculateCampaign();
    const selected = campaign.decisions[engineeringIndex];
    const pending = engineeringPreview ?? selected;
    const data = DECISIONS[engineeringIndex];
    const meters = [
      ['cost', resources.budget, LIMITS.budget, `$${resources.budget.toFixed(1)}M`, resources.budget <= LIMITS.budget],
      ['mass', resources.mass, LIMITS.mass, `${fmt(resources.mass)} kg`, resources.mass <= LIMITS.mass],
      ['power', resources.powerDemand, resources.availablePower, `${fmt(resources.powerDemand)} / ${fmt(resources.availablePower)} W`, resources.powerDemand <= resources.availablePower],
      ['science', resources.science, 100, `${fmt(resources.science)} / 100`, true],
      ['reliability', resources.reliability, 100, `${fmt(resources.reliability)} / 100`, resources.reliability >= 45]
    ];
    meters.forEach(([id, value, maximum, label, ok]) => {
      byId(`${id}Val`).textContent = label;
      const bar = byId(`${id}Bar`);
      bar.style.width = `${clamp((value / maximum) * 100, 0, 100)}%`;
      bar.style.background = ok ? 'var(--mk6-cyan)' : 'var(--mk6-red)';
    });
    const warnings = knownWarnings(resources);
    byId('riskCount').textContent = warnings.length ? `${warnings.length} WARNING` : 'NOMINAL';
    byId('riskList').innerHTML = warnings.length ? warnings.map((warning) => `<div class="risk">${warning}</div>`).join('') : 'No visible resource warnings.';
    byId('departmentMenu').innerHTML = departments.map((name, index) => {
      const done = campaign.decisions[index] !== null;
      return `<button class="department-link ${index === engineeringIndex ? 'active' : ''} ${done ? 'complete' : ''}" data-department="${index}" data-icon="${icons[index]}"><span class="department-mark">${done ? '✓' : icons[index]}</span><span class="dept-title">${name}<i class="dept-progress"><b style="width:${done ? 100 : 0}%"></b></i></span><small>${done ? 'SAVED' : 'OPEN'}</small></button>`;
    }).join('');
    document.querySelectorAll('[data-department]').forEach((button) => button.addEventListener('click', () => {
      engineeringIndex = Number(button.dataset.department);
      engineeringPreview = null;
      renderEngineering();
    }));
    byId('decisionNo').textContent = `DEPARTMENT ${String(engineeringIndex + 1).padStart(2, '0')}`;
    byId('category').textContent = data.cat;
    byId('phaseTitle').textContent = departments[engineeringIndex];
    byId('phaseDesc').textContent = data.description;
    byId('phaseTrack').innerHTML = departments.map((_, index) => `<span class="${campaign.decisions[index] !== null ? 'done' : index === engineeringIndex ? 'current' : ''}"></span>`).join('');
    byId('question').textContent = data.question;
    byId('description').textContent = data.description;
    byId('choices').innerHTML = data.options.map((option, index) => `<button class="choice ${pending === index ? 'selected' : ''}" data-choice="${index}"><span class="letter">OPTION ${String.fromCharCode(65 + index)}</span><h4>${option.name}</h4><p>${option.description}</p><small>PREVIEW IMPACT ↗</small></button>`).join('');
    document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
      engineeringPreview = Number(button.dataset.choice);
      renderEngineering();
    }));
    const previewOption = pending === null ? null : data.options[pending];
    byId('problems').innerHTML = previewOption ? previewOption.risks.map((risk) => `<div class="problem">${risk}</div>`).join('') : 'Select a design option to inspect risks.';
    byId('solutions').innerHTML = previewOption ? previewOption.mitigations.map((mitigation) => `<div class="solution">${mitigation}</div>`).join('') : 'Countermeasures appear with a preview.';
    if (previewOption) {
      const effect = previewOption.effects;
      byId('deltas').innerHTML = `<div class="delta-grid">${[
        ['MASS', effect.mass, 'kg'], ['BUDGET', effect.budget, 'M'], ['POWER', effect.power, 'W'], ['SCIENCE', effect.science, ''], ['RELIABILITY', effect.reliability, '']
      ].map(([label, value, unit]) => `<div class="delta"><span>${label}</span><b class="${value < 0 ? 'down' : value > 0 ? 'up' : ''}">${value > 0 ? '+' : ''}${value}${unit}</b><small>Complete model recalculates on save</small></div>`).join('')}</div>`;
    } else byId('deltas').textContent = 'Choose an option to preview connected variables.';
    const lock = byId('lock');
    lock.disabled = pending === null || pending === selected;
    lock.textContent = selected === pending && selected !== null ? 'DESIGN SAVED ✓' : selected === null ? 'SAVE DESIGN →' : 'UPDATE DESIGN →';
    byId('hint').textContent = selected === null ? 'Select an option, then save it to the shared campaign state.' : 'Changing a saved decision recalculates every resource from baseline.';
    byId('previous').disabled = engineeringIndex === 0;
    byId('nextDepartment').textContent = campaign.decisions[engineeringIndex] === null ? 'SKIP TO OPEN →' : 'NEXT DEPARTMENT →';
    renderScene(resources);
  }

  function renderScene(resources) {
    const selections = campaign.decisions;
    const rover = resources.inventory.rover;
    byId('roverUnit').classList.toggle('hidden-rover', !rover);
    const scene = byId('missionScene');
    scene.classList.toggle('has-ramp', selections[2] === 0);
    scene.classList.toggle('has-cable', selections[2] === 1);
    scene.classList.toggle('has-drop', selections[2] === 2);
    byId('sensorUpgrade').classList.toggle('upgrade-on', selections[3] === 1 || selections[3] === 2);
    byId('shieldUpgrade').classList.toggle('upgrade-on', selections[4] === 0 || selections[4] === 1);
    byId('storageUpgrade').classList.toggle('upgrade-on', selections[7] === 0 || selections[7] === 2);
    byId('powerUpgrade').classList.toggle('upgrade-on', selections[8] !== null);
    byId('commUpgrade').classList.toggle('upgrade-on', selections[6] !== null);
    const upgrades = [];
    if (rover) upgrades.push('ROVER SYSTEM');
    if (selections[3] !== null) upgrades.push('TOUCHDOWN LOGIC');
    if (selections[6] !== null) upgrades.push('EARTH LINK');
    if (selections[8] !== null) upgrades.push('POWER MODE');
    byId('sceneStatus').textContent = upgrades.length ? upgrades.join(' · ') : 'LANDER CONFIGURATION · BASELINE';
    byId('sceneCallout').textContent = engineeringPreview !== null ? `PREVIEW · ${DECISIONS[engineeringIndex].options[engineeringPreview].name.toUpperCase()}` : 'AWAITING DESIGN INPUT';
  }

  function saveDecision() {
    if (engineeringPreview === null) return;
    campaign.decisions[engineeringIndex] = engineeringPreview;
    engineeringPreview = null;
    renderEngineering();
    toast('Design saved · resources recalculated from the original baseline.');
  }

  function goToNextDepartment() {
    const next = campaign.decisions.findIndex((choice, index) => choice === null && index > engineeringIndex);
    const firstOpen = campaign.decisions.findIndex((choice) => choice === null);
    if (next >= 0) engineeringIndex = next;
    else if (firstOpen >= 0) engineeringIndex = firstOpen;
    else {
      renderReport();
      showPage('report');
      return;
    }
    engineeringPreview = null;
    renderEngineering();
  }

  function departmentForCheck(check) {
    const decision = check.label.match(/^(\d{2}) /);
    if (decision) return Number(decision[1]) - 1;
    const owningDepartment = {
      'Rover architecture': 1,
      'Sample instrument': 1,
      'Communications equipment': 6,
      'Payload manifest': 0,
      'Mass limit': 4,
      'Budget limit': 0,
      'Engineering power margin': 8,
      'Reliability margin': 5
    };
    return owningDepartment[check.label];
  }

  function reportChecks(checks) {
    return `<div class="review-checks">${checks.map((check, index) => {
      const department = !check.ok ? departmentForCheck(check) : undefined;
      const editAction = department === undefined ? '' : `<button class="review-edit" data-edit-department="${department}">EDIT ${departments[department]} →</button>`;
      return `<div id="reviewCheck-${index}" class="review-check ${check.status === 'WARNING' ? 'warning' : check.ok ? 'ok' : 'blocked'}"><b>${check.status || (check.ok ? 'COMPLETED' : 'INCOMPLETE')}</b><span>${check.label}</span><small>${check.detail}</small>${editAction}</div>`;
    }).join('')}</div>`;
  }

  function renderReport() {
    const resources = calculateCampaign();
    const checks = engineeringChecks(resources);
    const approved = checks.every((check) => check.ok);
    const trajectory = resources.trajectory;
    byId('reportContent').innerHTML = `
      <article id="engineeringGate"><label>ENGINEERING GATE</label><h3>${approved ? 'Flight-ready design' : 'Launch remains locked'}</h3><p>${approved ? 'All nine departments, the rover architecture, manifest and resource checks are complete.' : 'Resolve every INCOMPLETE or BLOCKED item before pre-launch can begin. Blocked items include a direct link to the department that can fix them.'}</p>${reportChecks(checks)}</article>
      <article><label>COMMITTED TRANSFER</label><h3>${trajectory ? trajectory.label : 'Not committed'}</h3><p>${trajectory ? `${trajectory.cruise} cruise · ${resources.payloadUsed}/${resources.payloadAllowance} payload units · $${trajectory.cost.toFixed(1)}M development impact · +${trajectory.schedule} month schedule impact.` : 'Trajectory selection is mandatory.'}</p><p class="muted">All trajectory numbers are fictional game-balancing values.</p></article>
      <article><label>PAYLOAD MANIFEST</label><h3>${resources.payloadUsed} / ${resources.payloadAllowance || '—'} units</h3>${resources.manifest.map((item) => `<p><strong>${item.name}</strong> — ${item.units} units</p>`).join('') || '<p>Choose a mission strategy to generate the manifest.</p>'}</article>
      <article><label>APPROVED EQUIPMENT</label><h3>Surface capability</h3><p>${Object.entries(resources.inventory).filter(([key, value]) => value === true && key !== 'rover').map(([key]) => key.replace(/([A-Z])/g, ' $1')).join(' · ') || 'No equipment approved yet.'}</p></article>`;
    byId('playCampaign').disabled = false;
    byId('playCampaign').textContent = approved ? 'BEGIN PRE-LAUNCH ▶' : 'REVIEW CHECKLIST ↓';
    byId('playCampaign').title = approved ? 'Begin the pre-launch checklist.' : 'Flight is locked. Review blocked checks and edit the linked engineering department.';
    byId('reportContent').querySelectorAll('[data-edit-department]').forEach((button) => button.addEventListener('click', () => {
      engineeringIndex = Number(button.dataset.editDepartment);
      engineeringPreview = null;
      showPage('engineering');
      renderEngineering();
      toast(`Review ${departments[engineeringIndex]} to resolve this blocked check.`);
    }));
  }

  function renderFinalBoard() {
    const resources = calculateCampaign();
    const final = campaign.flight.final || evaluateMission();
    const flight = campaign.flight;
    byId('reportContent').innerHTML = `
      <article class="final-verdict"><label>MISSION REVIEW BOARD</label><h3>${final.verdict}</h3><p>${final.explanation}</p><strong>BOARD CONFIDENCE · ${final.score}/100</strong></article>
      <article><label>CAMPAIGN EVALUATION</label><h3>What the board considered</h3>
        <p><strong>Trajectory</strong> — ${resources.trajectory.label}; ${resources.trajectory.cruise}; payload ${resources.payloadUsed}/${resources.payloadAllowance}.</p>
        <p><strong>Engineering</strong> — $${resources.budget.toFixed(1)}M, ${fmt(resources.mass)} kg, reliability ${fmt(resources.reliability)}/100, schedule ${resources.schedule} months.</p>
        <p><strong>Science return</strong> — ${flight.samples.length}/${resources.inventory.sampleCapacity} samples, ${fmt(resources.science + flight.operationScience)} total science points.</p>
        <p><strong>Surface operations</strong> — battery ${fmt(flight.battery)}%, temperature ${fmt(flight.temperature)}°C, ${flight.collected.length}/${SITES.length} sample sites visited.</p>
        <p><strong>Communications</strong> — ${flight.communicationsDelivered ? 'science data delivered to Earth' : 'no science packet delivered'}.</p>
      </article>
      <article><label>POST-MISSION RISK DISCLOSURE</label><h3>Hidden risk revealed</h3><p>Hidden risk index: ${Math.round(resources.hiddenRisk)}/100. This is disclosed only after the mission, not during engineering.</p><p>${Object.entries(resources.hiddenRiskBreakdown).map(([key, value]) => `${labelEquipment(key)} ${Math.round(value)}`).join(' · ') || 'No hidden risk increments were recorded.'}</p></article>
      <article><label>ENGINEERING DECISIONS</label><h3>Campaign design review</h3>${DECISIONS.map((department, index) => `<p><strong>${department.cat}</strong> — ${campaign.decisions[index] === null ? 'Incomplete' : department.options[campaign.decisions[index]].name}</p>`).join('')}</article>
      <article><label>POWER & THERMAL REVIEW</label><h3>Operating margin</h3><p>${Object.entries(flight.power).map(([key, value]) => `${labelEquipment(key)} ${value} W`).join(' · ')}</p><p>Allocated ${fmt(powerTotals().total)} / ${fmt(powerTotals().available)} W · Temperature ${fmt(flight.temperature)}°C (safe instrument range −45°C to 10°C) · environment ${fmt(flight.environment)}°C.</p></article>
      <article><label>MISSION EVENT LOG</label><h3>Operational conditions</h3>${flight.events.length ? flight.events.map((event) => `<p><strong>${event.label}</strong> — ${event.description}</p>`).join('') : '<p>No surface events were triggered during this campaign.</p>'}</article>
      <article><label>MISSION OBJECTIVES</label><h3>Mandatory and optional outcomes</h3>${objectiveChecks().map((check) => `<p>${check.ok ? 'COMPLETED' : 'INCOMPLETE'} · ${check.mandatory ? 'MANDATORY' : 'OPTIONAL'} · ${check.label}</p>`).join('')}</article>
      <article><label>REPLAY</label><h3>Start a genuinely fresh campaign</h3><button class="primary" id="boardReplay">↻ REPLAY FROM MISSION SELECT</button></article>`;
    byId('boardReplay').addEventListener('click', () => {
      resetCampaign();
      toast('Fresh campaign created. No mission variables were carried over.');
    });
  }

  function createTrajectoryLayer() {
    const layer = document.createElement('section');
    layer.id = 'trajectoryLayer';
    layer.innerHTML = `<div class="trajectory-top"><span>SECOND CHANCE · MK7</span><b>MONTH 00 · TRANSFER DESIGN</b><button id="trajectoryExit">EXIT TO MISSIONS</button></div>
      <div class="trajectory-layout"><aside id="trajectoryOptions" class="trajectory-options"></aside><section class="trajectory-main"><div class="trajectory-heading"><b>EARTH → MARS</b><span id="trajectoryCaption"></span></div>
        <div class="trajectory-diagram"><svg viewBox="0 0 760 500" role="img" aria-label="Educational Sun-centred Earth to Mars transfer diagram"><defs><radialGradient id="sunGlowMk7"><stop stop-color="#fff7cd"/><stop offset=".5" stop-color="#f2c66d"/><stop offset="1" stop-color="#d98938"/></radialGradient><marker id="transferArrowMk7" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#f2c66d"/></marker></defs>
          <g class="orbit-rings"><circle cx="380" cy="250" r="100"/><circle cx="380" cy="250" r="190"/></g><circle class="sun-core" cx="380" cy="250" r="18" fill="url(#sunGlowMk7)"/><text x="402" y="255">SUN</text>
          <circle class="earth-dot" cx="280" cy="250" r="9"/><text x="238" y="277">EARTH</text><circle class="mars-dot" cx="243" cy="119" r="11"/><text x="185" y="100">MARS · NOW</text><path class="lead-angle-rays" d="M380 250L280 250M380 250L243 119"/><path class="lead-angle-arc" d="M315 250 A65 65 0 0 1 333 206"/><circle class="arrival-marker" cx="570" cy="250" r="13"/><text x="572" y="278">MARS · ARRIVAL</text>
          <path id="transferPath" class="transfer-path" d="M280 250 A145 138 0 0 1 570 250" marker-end="url(#transferArrowMk7)"/><path id="transferGuide" class="transfer-guide" d="M280 250 A145 138 0 0 1 570 250"/>
          <g id="orbitCraft"><path d="M-15 0L-4 -5L9 0L-4 5Z" fill="#f2c66d" stroke="#fff4c9" stroke-width="1.5"/><path d="M-5 -4L-10 -12L2 -5M-5 4L-10 12L2 5" fill="#45d6c4" stroke="#d8fff8"/><circle r="2" fill="#fff"/></g>
          <g class="traj-labels"><text x="245" y="315">LAUNCH</text><text x="394" y="88">CRUISE</text><text x="550" y="315">ARRIVAL</text><text x="365" y="365">MARS LEAD ANGLE · ~44°</text><text x="297" y="390" class="orbit-caption">GAME-SCALED EDUCATIONAL TRANSFER · NOT A TRAJECTORY SOLVER</text></g>
          <path d="M280 250L280 230M570 250L570 230" class="marker-line"/></svg></div>
        <div id="trajectoryStats" class="trajectory-stats"></div><button id="trajectoryCommit" class="primary">COMMIT TRANSFER →</button></section><aside id="trajectoryInfo" class="trajectory-info"></aside></div>`;
    document.body.appendChild(layer);
    byId('trajectoryExit').addEventListener('click', closeTrajectory);
    byId('trajectoryCommit').addEventListener('click', commitTrajectory);
  }

  function showTrajectory() {
    if (campaign.decisions.some((choice) => choice !== null)) {
      toast('Trajectory is locked once engineering has begun. Reset for a new selection.');
      return;
    }
    if (!campaign.trajectory) campaign.trajectory = 'standard';
    byId('trajectoryLayer').classList.add('open');
    renderTrajectory();
  }

  function closeTrajectory() {
    byId('trajectoryLayer').classList.remove('open');
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    orbitFrame = null;
  }

  function renderTrajectory() {
    const trajectory = TRAJECTORIES[campaign.trajectory];
    byId('trajectoryOptions').innerHTML = `<label>SELECT TRANSFER</label>${Object.values(TRAJECTORIES).map((option) => `<button class="trajectory-option ${option.id === trajectory.id ? 'selected' : ''}" data-trajectory="${option.id}"><b>${option.id === 'fast' ? '▶' : option.id === 'heavy' ? '⬡' : '▷'}</b><span>${option.label}<small>${option.cruise}</small></span></button>`).join('')}<p>STANDARD and HEAVY LIFT share the reference ellipse. FAST uses a visibly different educational path.</p>`;
    document.querySelectorAll('[data-trajectory]').forEach((button) => button.addEventListener('click', () => {
      campaign.trajectory = button.dataset.trajectory;
      renderTrajectory();
    }));
    byId('trajectoryCaption').textContent = trajectory.summary;
    byId('trajectoryStats').innerHTML = `<span>CRUISE<b>${trajectory.cruise}</b></span><span>PAYLOAD<b>${trajectory.payload} UNITS</b></span><span>EXTRA COST<b>$${trajectory.cost.toFixed(1)}M</b></span><span>SCHEDULE<b>+${trajectory.schedule} MONTH</b></span>`;
    byId('trajectoryInfo').innerHTML = `<label>TRANSFER BRIEF</label><h3>${trajectory.label}</h3><p>${trajectory.summary}</p><div><b>01 · LAUNCH</b><small>Depart Earth from the launch marker.</small></div><div><b>02 · CRUISE</b><small>Spacecraft follows the visible dashed transfer path.</small></div><div><b>03 · ARRIVAL</b><small>Meet Mars at the arrival marker.</small></div><p class="trajectory-note">${trajectory.note}</p>`;
    byId('trajectoryCommit').textContent = `COMMIT ${trajectory.label} →`;
    const pathData = trajectory.id === 'fast' ? 'M280 250 C296 145 470 66 570 250' : 'M280 250 A145 138 0 0 1 570 250';
    byId('transferPath').setAttribute('d', pathData);
    byId('transferGuide').setAttribute('d', pathData);
    startOrbitAnimation(trajectory.id === 'heavy');
  }

  function startOrbitAnimation(isHeavy) {
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    const path = byId('transferPath');
    const craft = byId('orbitCraft');
    const length = path.getTotalLength();
    const started = performance.now();
    const animate = (now) => {
      if (!byId('trajectoryLayer').classList.contains('open')) return;
      const progress = ((now - started) % 8500) / 8500;
      const point = path.getPointAtLength(length * progress);
      const ahead = path.getPointAtLength(Math.min(length, length * progress + 2));
      const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI;
      craft.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle}) scale(${isHeavy ? 1.55 : 1})`);
      orbitFrame = requestAnimationFrame(animate);
    };
    orbitFrame = requestAnimationFrame(animate);
  }

  function commitTrajectory() {
    const selected = TRAJECTORIES[campaign.trajectory];
    closeTrajectory();
    engineeringIndex = 0;
    engineeringPreview = null;
    renderEngineering();
    showPage('engineering');
    toast(`${selected.label} committed · complete all nine departments before flight review.`);
  }

  function createFlightLayer() {
    const layer = document.createElement('section');
    layer.id = 'playLayer';
    layer.innerHTML = `<div class="play-top"><span>SECOND CHANCE // FLIGHT OPERATIONS · MK7</span><button id="flightEngineering">ENGINEERING REVIEW</button><button id="closePlay">✕ EXIT MISSION</button></div><div class="play-stage" id="playStage"><div class="play-stars"></div><div class="play-earth" id="playEarth"></div><div class="flight-mars" id="flightMars"></div><div class="transfer-arc" id="flightTransferArc"></div><div class="launch-rocket" id="launchRocket"><div class="rocket-nose"></div><div class="rocket-body"></div><div class="rocket-fin"></div><div class="rocket-fin right"></div><div class="rocket-flame"></div></div><div class="play-mars-ground" id="playMarsGround"></div><div class="play-landscape" id="playLandscape"><div class="play-lander"></div><div class="site-layer" id="siteLayer"></div><div class="play-rover" id="playRover"><span class="rover-arm"></span></div></div><section class="play-panel"><h2 id="playTitle"></h2><p id="playText"></p><p id="playTelemetry"></p><div id="preflightChecks" class="preflight-checks"></div><button class="play-action" id="playAction"></button></section><aside id="flightStageControls" class="flight-stage-controls"></aside><div class="play-controls" id="playControls"><b>CONTROLS</b><br><span id="controlCopy"></span></div><div class="play-rover-ui" id="roverUI"><button id="systemsButton">⚙ SYSTEMS / POWER</button><button id="collectSample">▣ COLLECT SAMPLE</button><button id="sendEarth">⌁ COMMUNICATE</button><button id="completeMission">✓ COMPLETE MISSION</button><span>BATTERY <b id="roverBattery">100%</b></span><div class="play-meter"><i id="roverBatteryBar"></i></div><span>TEMP <b id="roverTemp">-35°C</b></span></div><div id="systemsPanel" class="flight-modal"><article><button class="modal-close" data-close-modal="systemsPanel">✕ CLOSE</button><label>POWER & THERMAL CONTROL</label><h2>SPACECRAFT SYSTEMS</h2><p id="systemAvailability"></p><div id="powerSummary" class="power-summary"></div><div id="powerControls" class="power-controls"></div><button id="saveSystems" class="primary">SAVE POWER PLAN</button></article></div><div id="missionControl" class="flight-modal"><article><button class="modal-close" data-close-modal="missionControl">✕ CLOSE</button><label>EARTH COMMUNICATIONS</label><h2>MISSION CONTROL</h2><div id="communicationStatus"></div><button id="transmitReport" class="primary">QUEUE SCIENCE TRANSMISSION</button></article></div><div id="objectivePanel" class="flight-modal"><article><button class="modal-close" data-close-modal="objectivePanel">✕ CLOSE</button><label>MISSION COMPLETION</label><h2>OBJECTIVE CHECK</h2><div id="objectiveStatus"></div><button id="confirmComplete" class="primary">CONFIRM MISSION COMPLETE</button></article></div></div>`;
    document.body.appendChild(layer);
    byId('closePlay').addEventListener('click', closeFlight);
    byId('flightEngineering').addEventListener('click', () => { closeFlight(); renderReport(); showPage('report'); });
    byId('playAction').addEventListener('click', handleFlightAction);
    byId('systemsButton').addEventListener('click', openSystems);
    byId('collectSample').addEventListener('click', collectSample);
    byId('sendEarth').addEventListener('click', openMissionControl);
    byId('completeMission').addEventListener('click', openObjectives);
    byId('saveSystems').addEventListener('click', () => { byId('systemsPanel').classList.remove('open'); toast('Power plan saved to the shared mission state.'); });
    byId('transmitReport').addEventListener('click', queueTransmission);
    byId('confirmComplete').addEventListener('click', completeMission);
    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => byId(button.dataset.closeModal).classList.remove('open')));
  }

  function openFlight() {
    if (!canLaunch()) { toast('Flight remains locked until every engineering review check is complete.'); renderReport(); return; }
    byId('playLayer').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderFlight();
  }

  function closeFlight() {
    const layer = byId('playLayer');
    if (layer) layer.classList.remove('open');
    document.body.style.overflow = '';
  }

  function phaseContent(phase) {
    const resources = calculateCampaign();
    const stage = campaign.flight.stageSep;
    const content = {
      preflight: ['PRE-LAUNCH CHECKLIST', 'Verify propulsion, guidance, communications, thermal control and the approved payload before release.', `TRAJECTORY ${resources.trajectory.label} · PAYLOAD ${resources.payloadUsed}/${resources.payloadAllowance} · PREFLIGHT REQUIRED`, 'BEGIN COUNTDOWN →'],
      launch: ['EARTH LAUNCH', 'The launch vehicle is ready. Ignite only when mission control is green.', 'PAD SYSTEMS NOMINAL · GUIDANCE READY', 'IGNITE ENGINES ▶'],
      ascent: ['ASCENT / STAGE SEPARATION', `Mission control recommends Stage ${stage + 1} separation. Use the numbered controls in order.`, `STAGES RELEASED ${stage}/3 · KEY ${stage + 1} ACTIVE`, 'STAGING IN PROGRESS'],
      injection: ['TRANSFER INJECTION', 'All three stages are separated. Commit the spacecraft to the visible Mars transfer.', 'STAGE SEQUENCE COMPLETE · ORBITAL DEPARTURE READY', 'BEGIN TRANSFER INJECTION →'],
      cruise: ['EARTH–MARS TRANSFER', 'The spacecraft is coasting along the educational transfer phase. Mars approach is the next controlled transition.', `${resources.trajectory.label} · ${resources.trajectory.cruise} · SPACECRAFT IN TRANSIT`, 'BEGIN MARS APPROACH →'],
      entry: ['MARS APPROACH / EDL', 'Entry, descent and landing begin after the transfer phase; this is not a teleport from launch.', 'ARRIVAL MARKER REACHED · EDL GUIDANCE NOMINAL', 'BEGIN LANDING SEQUENCE →'],
      landed: ['MARS LANDING', 'Touchdown confirmed. Deploy the approved rover to start surface operations.', 'SURFACE · SOL 001 · LANDER HEALTH NOMINAL', 'DEPLOY ROVER ▶'],
      rover: ['ROVER EXPLORATION', 'Drive with WASD or arrow keys. Reach marked sites before using the robotic arm.', `SOL ${campaign.flight.sol.toFixed(2)} · SAMPLE STORAGE ${campaign.flight.samples.length}/${resources.inventory.sampleCapacity}`, ''],
      final: ['MISSION REVIEW BOARD', campaign.flight.final?.explanation || 'The board is calculating its verdict.', `BOARD CONFIDENCE ${campaign.flight.final?.score ?? 0}/100`, 'VIEW REVIEW BOARD →']
    };
    return content[phase];
  }

  function renderFlight() {
    const flight = campaign.flight;
    const [title, text, telemetry, action] = phaseContent(flight.phase);
    byId('playTitle').textContent = title;
    byId('playText').textContent = text;
    byId('playTelemetry').textContent = telemetry;
    byId('playAction').textContent = action;
    byId('playAction').style.display = flight.phase === 'rover' || flight.phase === 'ascent' ? 'none' : 'inline-block';
    byId('playEarth').style.display = ['preflight', 'launch', 'ascent', 'injection', 'cruise'].includes(flight.phase) ? 'block' : 'none';
    byId('flightMars').classList.toggle('visible', ['cruise', 'entry'].includes(flight.phase));
    byId('flightTransferArc').classList.toggle('visible', ['injection', 'cruise'].includes(flight.phase));
    byId('launchRocket').style.display = ['preflight', 'launch', 'ascent', 'injection', 'cruise', 'entry'].includes(flight.phase) ? 'block' : 'none';
    byId('launchRocket').classList.toggle('launched', !['preflight', 'launch'].includes(flight.phase));
    byId('launchRocket').style.bottom = flight.phase === 'preflight' ? '12%' : flight.phase === 'launch' ? '18%' : flight.phase === 'ascent' ? '59%' : flight.phase === 'entry' ? '27%' : '72%';
    byId('playMarsGround').style.display = ['entry', 'landed', 'rover', 'final'].includes(flight.phase) ? 'block' : 'none';
    byId('playLandscape').classList.toggle('active', ['landed', 'rover', 'final'].includes(flight.phase));
    byId('roverUI').classList.toggle('active', flight.phase === 'rover');
    byId('playControls').style.display = flight.phase === 'rover' ? 'none' : 'block';
    byId('controlCopy').textContent = flight.phase === 'ascent' ? '1 / 2 / 3 — separate the active stage\n← / → or A / D — steer' : 'SPACE — launch action\n1 / 2 / 3 — stage separation when prompted';
    renderPreflight();
    renderStageControls();
    renderRover();
    renderMissionControl();
    renderObjectivePanel();
    if (flight.phase === 'rover') updateRoverTelemetry();
  }

  function renderPreflight() {
    const node = byId('preflightChecks');
    if (campaign.flight.phase !== 'preflight') { node.style.display = 'none'; return; }
    node.style.display = 'block';
    const rows = [
      ['propulsion', 'PROPULSION', 'Thrust and staged separation sequence'], ['guidance', 'GUIDANCE', 'Navigation and landing logic'], ['communications', 'COMMUNICATIONS', 'Antenna and Earth-link plan'], ['thermal', 'THERMAL', 'Heaters and safe operating limits'], ['payload', 'PAYLOAD', 'Approved mass and manifest']
    ];
    node.innerHTML = `<label>FLIGHT READINESS · MONTH 00</label><div class="preflight-list">${rows.map(([id, label, detail]) => `<label><input type="checkbox" data-preflight="${id}" ${campaign.flight.preflight[id] ? 'checked' : ''}><span><b>${label}</b><small>${detail}</small></span><i>${campaign.flight.preflight[id] ? 'CHECKED' : 'CHECK'}</i></label>`).join('')}</div>`;
    node.querySelectorAll('[data-preflight]').forEach((input) => input.addEventListener('change', () => {
      campaign.flight.preflight[input.dataset.preflight] = input.checked;
      renderFlight();
    }));
    const ready = rows.every(([id]) => campaign.flight.preflight[id]);
    byId('playAction').disabled = !ready;
    byId('playAction').textContent = ready ? 'ALL SYSTEMS GREEN · BEGIN COUNTDOWN →' : 'COMPLETE FLIGHT READINESS CHECKS';
  }

  function renderStageControls() {
    const node = byId('flightStageControls');
    const active = campaign.flight.phase === 'ascent';
    node.classList.toggle('active', active);
    if (!active) { node.innerHTML = ''; return; }
    node.innerHTML = `<b>SEPARATION CONSOLE</b>${[1, 2, 3].map((number) => `<button data-stage="${number}" ${number !== campaign.flight.stageSep + 1 ? 'disabled' : ''}>${number <= campaign.flight.stageSep ? `STAGE ${number} ✓` : `KEY ${number} · SEPARATE STAGE ${number}`}</button>`).join('')}<small>Only the highlighted stage is safe to separate.</small>`;
    node.querySelectorAll('[data-stage]').forEach((button) => button.addEventListener('click', () => separateStage(Number(button.dataset.stage))));
  }

  function handleFlightAction() {
    const phase = campaign.flight.phase;
    if (phase === 'preflight') {
      if (!Object.values(campaign.flight.preflight).every(Boolean)) return toast('Complete all five flight-readiness checks first.');
      campaign.flight.phase = 'launch';
    } else if (phase === 'launch') campaign.flight.phase = 'ascent';
    else if (phase === 'injection') campaign.flight.phase = 'cruise';
    else if (phase === 'cruise') campaign.flight.phase = 'entry';
    else if (phase === 'entry') campaign.flight.phase = 'landed';
    else if (phase === 'landed') campaign.flight.phase = 'rover';
    else if (phase === 'final') { closeFlight(); renderFinalBoard(); showPage('report'); }
    renderFlight();
  }

  function separateStage(number) {
    const flight = campaign.flight;
    if (flight.phase !== 'ascent') return;
    if (number !== flight.stageSep + 1) return toast(`Stage ${flight.stageSep + 1} is the only safe separation now.`);
    flight.stageSep = number;
    if (number === 3) {
      flight.phase = 'injection';
      toast('Stage 3 separated · transfer injection is now required.');
    } else toast(`Stage ${number} separation confirmed · prepare Stage ${number + 1}.`);
    renderFlight();
  }

  function renderRover() {
    const flight = campaign.flight;
    const rover = byId('playRover');
    const surfaceBottom = 16.4 + flight.roverDepth * 0.047;
    rover.style.left = `${flight.roverX}%`;
    rover.style.bottom = `${surfaceBottom}%`;
    rover.classList.toggle('sampling', flight.armBusy);
    const resources = calculateCampaign();
    byId('siteLayer').innerHTML = SITES.map((site) => {
      const collected = flight.collected.includes(site.id);
      return `<div class="surface-site ${collected ? 'collected' : ''}" style="left:${site.x}%;bottom:${16.4 + site.depth * 0.047}%" title="${site.name}: ${site.description}"><b>${collected ? '✓' : '◆'}</b><span>${site.name}</span></div>`;
    }).join('');
    byId('collectSample').disabled = !resources.inventory.roboticArm || (!resources.inventory.camera && !resources.inventory.spectrometer) || flight.armBusy;
  }

  function updateRoverTelemetry() {
    const flight = campaign.flight;
    byId('roverBattery').textContent = `${fmt(flight.battery)}%`;
    byId('roverBatteryBar').style.width = `${clamp(flight.battery, 0, 100)}%`;
    byId('roverTemp').textContent = `${fmt(flight.temperature)}°C`;
    byId('playTelemetry').textContent = `SOL ${flight.sol.toFixed(2)} · BATTERY ${fmt(flight.battery)}% · TEMP ${fmt(flight.temperature)}°C · SAMPLES ${flight.samples.length}`;
    const closest = SITES.map((site) => ({ site, distance: Math.hypot(flight.roverX - site.x, flight.roverDepth - site.depth) })).sort((a, b) => a.distance - b.distance)[0];
    const collected = flight.collected.includes(closest.site.id);
    byId('playText').textContent = `${closest.site.name} · ${closest.site.description} · ${closest.site.type} · ${collected ? 'COLLECTED' : 'NOT COLLECTED'}`;
    if (flight.temperature < -45) byId('playText').textContent += ' · COLD: instruments unavailable; increase heating power.';
    else if (flight.temperature > 10) byId('playText').textContent += ' · HOT: reduce activity or heating before instrument use.';
  }

  function moveRover(key) {
    const flight = campaign.flight;
    if (!byId('playLayer').classList.contains('open') || flight.phase !== 'rover') return;
    let dx = 0;
    let depth = 0;
    if (key === 'arrowleft' || key === 'a') dx = -2.2;
    if (key === 'arrowright' || key === 'd') dx = 2.2;
    if (key === 'arrowup' || key === 'w') depth = 3; // ground-plane forward, never skyward
    if (key === 'arrowdown' || key === 's') depth = -3;
    if (!dx && !depth) return;
    const nextX = clamp(flight.roverX + dx, 7, 90);
    const nextDepth = clamp(flight.roverDepth + depth, 10, 88);
    const rockyExclusion = nextX > 56 && nextX < 65 && nextDepth > 43 && nextDepth < 56;
    if (rockyExclusion) return toast('Rocky outcrop ahead · choose another ground route.');
    const allocation = powerTotals();
    if (allocation.total > allocation.available) return toast('Mobility is blocked by a power-allocation deficit.');
    if (flight.power.mobility < 10 || flight.power.computing < 10) return toast('Mobility needs 10 W for drive motors and 10 W for onboard computing.');
    if (flight.battery <= 2) return toast('Battery reserve is too low for rover movement.');
    flight.roverX = nextX;
    flight.roverDepth = nextDepth;
    const backupFactor = calculateCampaign().inventory.backupBattery ? 0.65 : 1;
    flight.battery = clamp(flight.battery - Math.max(0.5, flight.power.mobility / 35) * backupFactor, 0, 100);
    const heatingWorks = flight.power.heating >= 15 && allocation.remaining >= 0;
    flight.temperature = clamp(flight.temperature + (heatingWorks ? 0.7 : -1.8), -80, 25);
    flight.sol += 0.015;
    renderRover();
    triggerMissionEvents();
  }

  function triggerMissionEvents() {
    const flight = campaign.flight;
    let latestEvent = null;
    while (flight.nextMissionEvent < MISSION_EVENTS.length && flight.sol >= MISSION_EVENTS[flight.nextMissionEvent].sol) {
      const event = MISSION_EVENTS[flight.nextMissionEvent++];
      latestEvent = event;
      if (event.id === 'dust') {
        flight.generationPenalty += 20;
        flight.battery = clamp(flight.battery - 5, 0, 100);
      } else if (event.id === 'cold') {
        flight.environment = -72;
        flight.temperature = clamp(flight.temperature - 8, -80, 25);
      } else if (event.id === 'science') {
        const inventory = calculateCampaign().inventory;
        flight.operationScience += inventory.spectrometer ? 12 : inventory.thermalInstrument ? 8 : inventory.camera ? 5 : 0;
      } else if (event.id === 'terrain') flight.battery = clamp(flight.battery - 3, 0, 100);
      flight.events.push({ label: event.label, description: event.message });
      toast(`Mission event · ${event.label}`);
    }
    updateRoverTelemetry();
    if (latestEvent) {
      byId('playTitle').textContent = `MISSION EVENT · ${latestEvent.label}`;
      const nearby = nearbySite();
      byId('playText').textContent = `${latestEvent.message}${nearby ? ` Nearby site: ${nearby.name} — ${nearby.description}` : ''}`;
    }
  }

  function nearbySite() {
    const flight = campaign.flight;
    return SITES.find((site) => !flight.collected.includes(site.id) && Math.hypot(flight.roverX - site.x, flight.roverDepth - site.depth) < 9);
  }

  function collectSample() {
    const flight = campaign.flight;
    const resources = calculateCampaign();
    const site = nearbySite();
    if (!site) return toast('Move within collection distance of a marked sample site.');
    const missing = site.requires.filter((equipment) => !resources.inventory[equipment]);
    if (missing.length) return toast(`Collection unavailable: ${missing.map(labelEquipment).join(', ')} was not approved in engineering.`);
    if (flight.samples.length >= resources.inventory.sampleCapacity) return toast(`Sample storage is full (${resources.inventory.sampleCapacity}).`);
    if (flight.battery < 10) return toast('Battery reserve is too low to run the sample arm and instruments.');
    if (flight.power.science < 25) return toast('Allocate at least 25 W to science instruments before collection.');
    if (flight.power.computing < 10) return toast('Onboard computing needs 10 W to command the sample sequence.');
    if (flight.temperature < -45 || flight.temperature > 10) return toast('Instrument temperature is outside the safe -45°C to 10°C operating range.');
    if (powerTotals().total > powerTotals().available) return toast('Resolve the power deficit before science collection.');
    flight.armBusy = true;
    renderRover();
    toast(`Robotic arm extending at ${site.name}…`);
    const timer = setTimeout(() => {
      flight.armBusy = false;
      flight.collected.push(site.id);
      flight.samples.push({ name: site.name, type: site.type });
      flight.battery = clamp(flight.battery - 5, 0, 100);
      flight.events.push({ label: 'SAMPLE COLLECTED', description: `${site.type} secured at ${site.name}.` });
      renderRover();
      updateRoverTelemetry();
      toast(`Sample secured · ${site.type} added to storage.`);
    }, 1200);
    communicationTimers.push(timer);
  }

  function labelEquipment(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()); }

  function powerTotals() {
    const resources = calculateCampaign();
    const total = Object.values(campaign.flight.power).reduce((sum, value) => sum + Number(value), 0);
    const available = Math.max(0, resources.availablePower - campaign.flight.generationPenalty);
    return { total, available, remaining: available - total };
  }

  function openSystems() {
    const resources = calculateCampaign();
    byId('systemsPanel').classList.add('open');
    byId('systemAvailability').innerHTML = `<strong>Engineering-approved inventory:</strong> ${Object.entries(resources.inventory).filter(([key, value]) => value === true && key !== 'rover').map(([key]) => labelEquipment(key)).join(' · ')}<br><span>Unselected equipment cannot be installed during surface operations.</span>`;
    renderPowerControls();
  }

  function renderPowerControls() {
    const totals = powerTotals();
    const flight = campaign.flight;
    byId('powerSummary').innerHTML = `<b>AVAILABLE ${fmt(totals.available)} W</b><b>ALLOCATED <span id="allocatedPowerValue">${fmt(totals.total)}</span> W</b><b class="${totals.remaining < 0 ? 'deficit' : ''}" id="remainingPowerValue">${totals.remaining >= 0 ? `REMAINING ${fmt(totals.remaining)} W` : `DEFICIT ${fmt(Math.abs(totals.remaining))} W`}</b><small>Environmental temperature ${flight.environment}°C · instrument safe range −45°C to 10°C · heater allocation <span id="heaterPowerValue">${flight.power.heating}</span> W</small>`;
    const labels = { communications: 'COMMUNICATIONS', science: 'SCIENCE INSTRUMENTS', mobility: 'MOBILITY', heating: 'HEATING', computing: 'COMPUTING', standby: 'STANDBY' };
    byId('powerControls').innerHTML = Object.entries(labels).map(([key, label]) => `<label>${label}<output>${flight.power[key]} W</output><input type="range" min="0" max="100" value="${flight.power[key]}" data-power="${key}"></label>`).join('');
    byId('powerControls').querySelectorAll('[data-power]').forEach((input) => input.addEventListener('input', () => {
      flight.power[input.dataset.power] = Number(input.value);
      updatePowerSummary();
      input.parentElement.querySelector('output').textContent = `${flight.power[input.dataset.power]} W`;
    }));
  }

  function updatePowerSummary() {
    const totals = powerTotals();
    const allocated = byId('allocatedPowerValue');
    const remaining = byId('remainingPowerValue');
    const heating = byId('heaterPowerValue');
    if (allocated) allocated.textContent = fmt(totals.total);
    if (remaining) {
      remaining.textContent = totals.remaining >= 0 ? `REMAINING ${fmt(totals.remaining)} W` : `DEFICIT ${fmt(Math.abs(totals.remaining))} W`;
      remaining.classList.toggle('deficit', totals.remaining < 0);
    }
    if (heating) heating.textContent = campaign.flight.power.heating;
    renderMissionControl();
  }

  function signalAvailable() { return Math.floor(campaign.flight.sol) % 3 !== 0; }

  function openMissionControl() {
    byId('missionControl').classList.add('open');
    renderMissionControl();
  }

  function renderMissionControl() {
    const node = byId('communicationStatus');
    if (!node) return;
    const resources = calculateCampaign();
    const totals = powerTotals();
    const signal = signalAvailable();
    const queue = campaign.flight.commQueue.length ? campaign.flight.commQueue.map((item) => `<li>${item.status} · ${item.label}</li>`).join('') : '<li>NO QUEUED PACKETS</li>';
    const eventLog = campaign.flight.events.length ? campaign.flight.events.map((event) => `<li>${event.label} · ${event.description}</li>`).join('') : '<li>NO SURFACE EVENTS LOGGED</li>';
    node.innerHTML = `<div class="comm-status">SIGNAL · <b class="${signal ? '' : 'offline'}">${signal ? 'AVAILABLE' : 'OCCLUDED'}</b><br>ANTENNA · <b class="${resources.inventory.antenna ? '' : 'offline'}">${resources.inventory.antenna ? 'INSTALLED' : 'NOT INSTALLED'}</b><br>COMMS POWER · <b class="${campaign.flight.power.communications >= 20 && totals.remaining >= 0 ? '' : 'offline'}">${campaign.flight.power.communications} W / 20 W REQUIRED</b><br>SIMULATED DELAY · <b>2 SECONDS</b></div><h3>TRANSMISSION QUEUE</h3><ul>${queue}</ul><h3>RECEIVED INSTRUCTIONS</h3><ul>${campaign.flight.receivedInstructions.map((instruction) => `<li>${instruction}</li>`).join('')}</ul><h3>MISSION EVENT LOG</h3><ul>${eventLog}</ul>`;
    byId('transmitReport').disabled = !signal || !resources.inventory.antenna || campaign.flight.power.communications < 20 || campaign.flight.power.computing < 10 || totals.remaining < 0 || campaign.flight.samples.length === 0;
  }

  function queueTransmission() {
    const resources = calculateCampaign();
    const totals = powerTotals();
    if (!resources.inventory.antenna) return toast('No engineering-approved antenna is available.');
    if (campaign.flight.power.communications < 20) return toast('Allocate at least 20 W to communications.');
    if (campaign.flight.power.computing < 10) return toast('Onboard computing needs 10 W to encode and queue the transmission.');
    if (totals.remaining < 0) return toast('Resolve the power deficit before transmission.');
    if (!signalAvailable()) return toast('Signal is currently occluded; keep operating and try later.');
    if (!campaign.flight.samples.length) return toast('Collect a sample before transmitting science data.');
    const packet = { label: `${campaign.flight.samples.length} SCIENCE SAMPLE REPORT`, status: 'QUEUED' };
    campaign.flight.commQueue.push(packet);
    renderMissionControl();
    toast('Science packet queued for Earth · simulated delay started.');
    const timer = setTimeout(() => {
      packet.status = 'DELIVERED';
      campaign.flight.communicationsDelivered = true;
      campaign.flight.receivedInstructions.unshift('Earth: science packet received. Continue optional site survey if resources allow.');
      renderMissionControl();
      toast('Earth received the science packet.');
    }, 2000);
    communicationTimers.push(timer);
  }

  function objectiveChecks() {
    const flight = campaign.flight;
    return [
      { mandatory: true, label: 'Collect at least one physical sample', ok: flight.samples.length > 0 },
      { mandatory: true, label: 'Deliver one science packet to Earth', ok: flight.communicationsDelivered },
      { mandatory: true, label: 'Maintain power, temperature and command reserves', ok: flight.battery > 10 && flight.temperature >= -45 && flight.temperature <= 10 && flight.power.computing >= 10 && flight.power.standby >= 5 },
      { mandatory: false, label: 'Collect all three optional science sites', ok: flight.collected.length === SITES.length },
      { mandatory: false, label: 'Finish with 50% battery reserve', ok: flight.battery >= 50 }
    ];
  }

  function openObjectives() {
    byId('objectivePanel').classList.add('open');
    renderObjectivePanel();
  }

  function renderObjectivePanel() {
    const node = byId('objectiveStatus');
    if (!node) return;
    const checks = objectiveChecks();
    const mandatoryOK = checks.filter((check) => check.mandatory).every((check) => check.ok);
    node.innerHTML = `<p>Mandatory objectives are required. Optional science goals improve the board assessment but do not prevent completion.</p>${checks.map((check) => `<div class="objective ${check.ok ? 'ok' : 'missing'}"><b>${check.ok ? '✓' : '!'}</b><span>${check.label}<small>${check.mandatory ? 'MANDATORY' : 'OPTIONAL'}</small></span></div>`).join('')}`;
    byId('confirmComplete').disabled = !mandatoryOK;
    byId('confirmComplete').textContent = mandatoryOK ? 'CONFIRM MISSION COMPLETE' : 'COMPLETE MANDATORY OBJECTIVES';
  }

  function completeMission() {
    if (!objectiveChecks().filter((check) => check.mandatory).every((check) => check.ok)) return toast('Mandatory objectives are not complete.');
    campaign.flight.final = evaluateMission();
    campaign.flight.phase = 'final';
    byId('objectivePanel').classList.remove('open');
    renderFlight();
  }

  function evaluateMission() {
    const resources = calculateCampaign();
    const flight = campaign.flight;
    const optional = objectiveChecks().filter((check) => !check.mandatory && check.ok).length;
    let score = 20;
    score += resources.reliability * 0.3;
    score += resources.science * 0.18;
    score += flight.operationScience * 0.6;
    score += flight.samples.length * 10;
    score += flight.communicationsDelivered ? 12 : 0;
    score += optional * 6;
    score += flight.battery >= 50 ? 8 : flight.battery > 20 ? 3 : -8;
    score += flight.temperature >= -45 && flight.temperature <= 10 ? 4 : -16;
    score -= resources.hiddenRisk * 0.22;
    score = clamp(Math.round(score), 0, 100);
    const critical = flight.battery <= 0 || flight.temperature < -55;
    const verdict = critical ? 'MISSION FAILURE' : score >= 72 ? 'COMPLETE SUCCESS' : score >= 52 ? 'PARTIAL SUCCESS' : 'MISSION RECOVERY';
    const explanation = critical ? 'A critical power or thermal condition ended operational capability.' : verdict === 'COMPLETE SUCCESS' ? 'Engineering margins, operations and data return supported the mission objectives.' : verdict === 'PARTIAL SUCCESS' ? 'The campaign met mandatory objectives, with clear opportunities to improve margins or science return.' : 'The team recovered the core mission after reduced margins limited the final result.';
    return { score, verdict, explanation };
  }

  function handleKeyboard(event) {
    const key = event.key.toLowerCase();
    const flightOpen = byId('playLayer')?.classList.contains('open');
    if (!flightOpen) return;
    if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) event.preventDefault();
    if (campaign.flight.phase === 'rover') return moveRover(key);
    if (campaign.flight.phase === 'ascent') {
      if (['1', '2', '3'].includes(key)) separateStage(Number(key));
      if (key === 'arrowleft' || key === 'a') campaign.flight.steer = clamp(campaign.flight.steer - 2, -20, 20);
      if (key === 'arrowright' || key === 'd') campaign.flight.steer = clamp(campaign.flight.steer + 2, -20, 20);
      byId('launchRocket').style.left = `calc(50% + ${campaign.flight.steer}px)`;
      return;
    }
    if (key === ' ' && !byId('playAction').disabled && byId('playAction').style.display !== 'none') handleFlightAction();
    if (['1', '2', '3'].includes(key) && campaign.flight.phase !== 'ascent') toast('Stage separation is only available during the ascent phase.');
  }

  function bindStaticUI() {
    document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page)));
    byId('briefingChoose').addEventListener('click', () => { campaign.introSeen = true; });
    byId('selectMars').addEventListener('click', () => {
      if (!campaign.introSeen) {
        showPage('briefing');
        toast('Review the mission objectives before selecting a transfer.');
        return;
      }
      resetCampaign({ navigate: false });
      campaign.introSeen = true;
      showTrajectory();
    });
    byId('exit').addEventListener('click', () => showPage('missions'));
    byId('lock').addEventListener('click', saveDecision);
    byId('previous').addEventListener('click', () => { if (engineeringIndex > 0) { engineeringIndex -= 1; engineeringPreview = null; renderEngineering(); } });
    byId('nextDepartment').addEventListener('click', goToNextDepartment);
    byId('reset').addEventListener('click', () => { if (window.confirm('Reset every campaign decision and flight variable?')) { resetCampaign({ navigate: false }); showPage('engineering'); toast('Campaign reset to its original baseline.'); } });
    byId('openReport').addEventListener('click', () => { renderReport(); showPage('report'); });
    byId('continue').addEventListener('click', () => { showPage('engineering'); renderEngineering(); });
    byId('playCampaign').addEventListener('click', () => {
      if (canLaunch()) return openFlight();
      const firstBlocked = document.querySelector('.review-check.blocked');
      firstBlocked?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBlocked?.classList.add('review-focus');
      toast('Flight remains locked. Use EDIT DEPARTMENT on each blocked item to fix the design.');
    });
    document.addEventListener('keydown', handleKeyboard);
  }

  function initialise() {
    campaign = newCampaign();
    createTrajectoryLayer();
    createFlightLayer();
    bindStaticUI();
    renderEngineering();
  }

  initialise();
  window.resetCampaign = resetCampaign;
})();
