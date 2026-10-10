/* Ask about Karan: a free, offline assistant. No AI service, no server, no API key.
   It answers from hand-written answers plus a search of this page's own text. */
(function () {
  'use strict';
  var root = document.querySelector('.wrap');
  var log = document.getElementById('chat-log');
  var input = document.getElementById('chat-input');
  var panel = document.getElementById('chat');
  var fab = document.getElementById('chat-open');
  var chipsBox = document.getElementById('chat-sugg');
  if (!root || !log || !input || !panel || !fab) return;

  /* ---------- 1. Read the page ---------- */
  var units = [], lists = { work: [], proj: [], dash: [], repos: [], contact: [], skills: [] };
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function unit(ctx, text, label, href, hdr) { if (text) units.push({ ctx: ctx, text: text, label: label, href: href, hdr: !!hdr }); }
  root.querySelectorAll('section').forEach(function (sec) {
    var label = txt(sec.querySelector('h2'));
    var secHref = '#' + sec.id;
    if (sec.id === 'about') sec.querySelectorAll('p,.chip').forEach(function (e) { unit('About', txt(e), label, secHref); });
    sec.querySelectorAll('.role').forEach(function (r) {
      var co = txt(r.querySelector('b')), when = txt(r.querySelector('.when')), sub = txt(r.querySelector('.sub'));
      var href = r.id ? '#' + r.id : secHref;
      var title = sub.split(' · ')[0];
      if (sec.id === 'experience') { var head = title + ' at ' + co + ' (' + when + ')'; unit(co, head, label, href, true); lists.work.push(head); }
      else if (sec.id === 'projects') { lists.proj.push(co); unit(co, sub + ': ' + co, label, href); }
      r.querySelectorAll('li').forEach(function (li) { unit(co, txt(li), label, href); });
    });
    sec.querySelectorAll('.card').forEach(function (cd) {
      var n = txt(cd.querySelector('h3')), href = cd.id ? '#' + cd.id : secHref;
      unit(n, txt(cd.querySelector('p')) + ' [' + txt(cd.querySelector('.meta')) + ']', label, href);
      lists.repos.push(n);
    });
    sec.querySelectorAll('.viz').forEach(function (v) {
      var n = txt(v.querySelector('h3')), href = v.id ? '#' + v.id : secHref;
      unit(n, txt(v.querySelector('p')), label, href); lists.dash.push(n);
    });
    if (sec.querySelector('dl')) sec.querySelectorAll('dt').forEach(function (dt) {
      var v = txt(dt.nextElementSibling);
      unit(txt(dt), v, label, secHref);
      if (sec.id === 'contact') lists.contact.push(txt(dt) + ': ' + v);
      if (sec.id === 'skills') lists.skills.push(txt(dt) + ': ' + v);
    });
  });

  /* ---------- 2. Hand-written answers ----------
     [id, link target, link label, question shown as a chip, keyword patterns, answer, follow-up ids] */
  var A = [
    ['intro', '#about', 'About', 'Who is Karan?', ['who is', 'about (karan|him)', 'introduc', 'tell me about (him|karan)\\b', 'summary', 'overview', 'background'],
      'Karan Jhaveri is an MS Technology Management student at Gies College of Business (UIUC) who works across data analytics, AI agents and product research. He has worked at Marsh, Allcargo and the Office of the CIO, and co-founded Tvastra.', ['work', 'skills', 'projects']],
    ['location', '#about', 'About', 'Where is Karan based?', ['where.*(live|based|located|from)', 'location', 'which city', 'country'],
      'He is based in Champaign, Illinois while studying at UIUC. He did his B.Tech and his earlier jobs in Mumbai, India.', ['edu', 'work']],
    ['contact', '#contact', 'Contact', 'How can I contact him?', ['e-?mail', 'contact', 'reach', 'get in touch', 'message him'],
      function () { return 'Email: kkj3@illinois.edu. LinkedIn: linkedin.com/in/karan-jhaveri-2aa22a200. GitHub: github.com/karan136-droid. Tableau: public.tableau.com/app/profile/karan.jhaveri1845.'; }, ['work', 'projects']],
    ['linkedin', '#contact', 'Contact', 'What is his LinkedIn?', ['linkedin'], 'linkedin.com/in/karan-jhaveri-2aa22a200', ['contact']],
    ['github', '#code', 'Code', 'What is his GitHub?', ['github', 'git hub', 'repos?\\b', 'repositor', 'source code', 'open source'],
      'His GitHub is github.com/karan136-droid. Public repos on this site: signal-to-roadmap, NetWatch, Empathetic-Uber, The 800 Billion Question, Karan-Bot and a fork of marimo.', ['signal', 'netwatch', 'projects']],
    ['tableauprofile', '#contact', 'Contact', 'Where are his Tableau dashboards?', ['tableau (profile|public)', 'public profile'], 'His Tableau Public profile is public.tableau.com/app/profile/karan.jhaveri1845, and the four dashboards are embedded in the Tableau dashboards section.', ['dash']],
    ['edu', '#education', 'Education', 'What is he studying?', ['education', 'degree', '\\bmasters?\\b', '\\bms\\b', 'studying', 'studied', '\\bstudy\\b', 'gies', 'uiuc', 'illinois', 'university', 'college', 'school', 'major'],
      'He is finishing an MS in Technology Management at Gies College of Business, UIUC (Aug 2025 - Aug 2026, CGPA 3.99/4.0), after a B.Tech in Information Technology at NMIMS Mumbai (Jul 2020 - Aug 2024, CGPA 3.56/4.0).', ['gpa', 'courses', 'bgs']],
    ['btech', '#item-nmims', 'NMIMS', 'What was his undergraduate degree?', ['b\\.?tech', 'nmims', 'undergrad', 'bachelor', 'svkm'],
      'B.Tech in Information Technology at SVKM NMIMS Mukesh Patel School of Technology Management and Engineering, Mumbai (Jul 2020 - Aug 2024), CGPA 3.56/4.0.', ['edu', 'courses']],
    ['gpa', '#education', 'Education', 'What is his GPA?', ['\\bgpa\\b', 'cgpa', 'grades?\\b', 'academic performance', 'marks'],
      'CGPA 3.99/4.0 in the MS at Gies (UIUC) and 3.56/4.0 in the B.Tech at NMIMS.', ['bgs', 'courses']],
    ['bgs', '#education', 'Education', 'Is he a Beta Gamma Sigma honoree?', ['beta gamma', 'honou?r', 'honor society'],
      'Yes. He is a Beta Gamma Sigma honoree, the International Business Honor Society, at Gies.', ['award', 'gpa']],
    ['award', '#item-allcargo', 'Allcargo', 'What awards has he won?', ['award', 'recogni', 'top-?flight', 'prize'],
      'He is a Beta Gamma Sigma honoree at Gies, and won the Top-flight Performer Award (FY 2023-24) at Allcargo for measurable operational impact.', ['allcargo', 'bgs']],
    ['courses', '#education', 'Education', 'Which courses has he taken?', ['coursework', 'courses?\\b', 'classes', 'subjects', 'curriculum', 'syllabus'],
      'Gies: Analytics for Management Decision Making, Data Analytics for Marketing Applications, Enterprise Database Management, Topics in Business Intelligence, Data Storytelling, Technology Strategy, Managing Innovation, Project Management, Human-Centered Design, Design Thinking and UX Design. NMIMS: Management Information Systems, Database Management Systems, Software Project Management, Software Engineering, Probability and Statistics, Visual Analytics, Data Warehousing and Mining, Machine Learning Algorithms, Principles of AI, AI and Robotics, Cloud Computing and Human Computer Interaction.', ['edu', 'skills']],
    ['work', '#experience', 'Experience', 'Where has he worked?', ['which compan', 'compan(y|ies)', 'employers?', 'where.*work', 'work history', 'career', 'jobs?\\b', 'work experience', 'professional experience', 'internships?', '~roles?\\b', '~positions?'],
      function () { return lists.work.join('\n'); }, ['ocio', 'marsh', 'highlights']],
    ['current', '#item-ocio', 'Office of the CIO', 'What is he doing now?', ['current', 'right now', 'presently', 'latest', 'most recent', 'now doing', 'these days'],
      'His most recent role was AI Solutions Assistant at the University of Illinois Office of the CIO (May 2026 - Aug 2026). He is finishing his MS at Gies.', ['ocio', 'agents']],
    ['before', '#experience', 'Experience', 'What did he do before Illinois?', ['before (illinois|gies|uiuc|his ms|the ms)', 'prior (experience|work)', 'previous(ly)?', 'earlier'],
      'Before Illinois he was a Specialist in Data Analytics and Insights at Marsh (Sep 2024 - Jul 2025), a Business Excellence Intern at Allcargo, co-founder and CEO of Tvastra, and an intern at the Nuclear Power Corporation of India, Glossaread and Acadza.', ['marsh', 'allcargo', 'tvastra']],
    ['experience', '#experience', 'Experience', 'How much experience does he have?', ['how (much|many years)', 'years of experience', 'experienced', 'full-?time', 'seniority'],
      'His full-time role was about 10 months at Marsh (Sep 2024 - Jul 2025). Before that he did internships at Allcargo, the Nuclear Power Corporation of India, Glossaread and Acadza, co-founded and ran Tvastra, and most recently worked at the Office of the CIO (May 2026 - Aug 2026).', ['work', 'highlights']],
    ['aiprojects', '#code', 'Code', 'What AI projects has he built?', ['!ai projects?', '!projects? (with|using|involving|on|in) (ai|ml|llms?|machine learning|agents?)', '!(ai|ml|llm|genai|gen ai) (and|or|\\/)? ?(ml |ai )?(work|projects?|side projects?|apps?|products?)', '!machine learning', '!\\bml\\b', '!llm projects?', '!agentic'],
      'AI projects: signal-to-roadmap (multi-agent system with an MCP server and LangGraph that turns customer feedback into product recommendations), NetWatch (ensemble ML anomaly detection for account takeovers and fraud), the Gies Marketing Matrix (a Copilot Studio agent built in 24 hours), The Chip Race (a companion Claude chatbot) and HEARTH (prototyped with Claude). At work, he shipped 3 Copilot Studio agents at the Office of the CIO.', ['signal', 'netwatch', 'agents']],
    ['agents', '#item-ocio', 'Office of the CIO', 'What AI agents did he build?', ['agent', 'copilot', 'chat ?bots?', '\\bbots?\\b', 'ai (solutions|work)', 'artificial intelligence'],
      'At the Office of the CIO he shipped 3 production AI agents in Microsoft Copilot Studio (HR Policy, IT Helpdesk Triage, Policy Q&A), led architecture for a 5-agent Master Employee Agent system, and proposed a 111-agent enterprise architecture with an Agent Factory meta-agent.', ['master', 'testing', 'ocio']],
    ['ocio', '#item-ocio', 'Office of the CIO', 'What did he do at the Office of the CIO?', ['ocio', 'office of the cio', '\\bcio\\b'],
      'At the Office of the CIO (May 2026 - Aug 2026) he shipped 3 Copilot Studio agents, architected a 5-agent Master Employee Agent system, proposed a 111-agent enterprise AI rollout with a 12-month plan, authored a 4-category agent testing framework, and led an AI adoption assessment across 5 campus units.', ['agents', 'assessment', 'marsh']],
    ['master', '#item-ocio', 'Office of the CIO', 'What is the Master Employee Agent?', ['!master employee', '!5-?agent', 'sharepoint', 'orchestrat', 'routing', 'procurement', 'leave management'],
      'He led solution architecture for a 5-agent Master Employee Agent system with SharePoint read/write integration and orchestrated routing across Procurement, Leave Management and an AI coaching agent.', ['agents', 'testing']],
    ['agent111', '#item-ocio', 'Office of the CIO', 'What is the 111-agent proposal?', ['!111', '!agent factory', '!meta-?agent', 'rollout', '12-?month'],
      'He proposed a 111-agent enterprise AI architecture (student- and employee-facing) with a phased 12-month rollout, and an Agent Factory meta-agent that lets staff create agents from plain language.', ['agents', 'master']],
    ['testing', '#item-ocio', 'Office of the CIO', 'What testing framework did he write?', ['!testing', '!qa framework', 'quality assurance', 'deployment standard'],
      'He authored a reusable 4-category agent testing and QA framework that became the team\'s deployment standard, and resolved orchestrator routing failures through usability testing.', ['agents', 'ocio']],
    ['assessment', '#item-ocio', 'Office of the CIO', 'What was the AI adoption assessment?', ['landscape', 'adoption', 'gartner', 'forrester', 'big ten', 'enterprise ai strategy', 'campus units'],
      'He led an AI adoption landscape assessment across 5 campus units, benchmarked against Gartner and Forrester frameworks and Big Ten peers, to inform a phased Enterprise AI Strategy for OCIO leadership.', ['agent111', 'ocio']],
    ['marsh', '#item-marsh', 'Marsh', 'What did he do at Marsh?', ['marsh', 'mercer', 'mmc', 'specialist', 'data analytics and insights'],
      'At Marsh (Sep 2024 - Jul 2025) he automated 3 manual workflows with Power Automate and Power Apps (an estimated 60% less processing time), cleaned 500K+ records with Python and SQL (30% lower data error rate), built Power BI dashboards that cut executive review time by an estimated 40%, and mapped decision journeys of 10+ stakeholders.', ['marshauto', 'marshbi', 'marshdata']],
    ['marshauto', '#item-marsh', 'Marsh', 'What did he automate at Marsh?', ['automat', 'power apps', 'power automate', 'workflows?', 'bottleneck', 'processing time', 'headcount', 'root-?cause'],
      'At Marsh he used stakeholder interviews and root-cause analysis to find 3 manual workflows causing bottlenecks, then built Power Automate and Power Apps automations that cut processing time by an estimated 60%, reduced manual errors and let teams scale without added headcount.', ['marsh', 'marshbi']],
    ['marshbi', '#item-marsh', 'Marsh', 'What dashboards did he build at Marsh?', ['power bi', 'executive', 'review time', 'upload cycles'],
      'At Marsh he built interactive Power BI dashboards that cut executive reporting review time by an estimated 40% across 100+ upload cycles, using iterative information design and end-user feedback.', ['marsh', 'marshdata']],
    ['marshdata', '#item-marsh', 'Marsh', 'How much data did he clean at Marsh?', ['500k', 'records', 'error rate', 'cat model', '\\betl\\b', 'pipelines?', 'data quality', 'data cleaning'],
      'At Marsh he cleaned and analyzed 500K+ records with Python and SQL data pipelines and ETL for CAT Modelling, reducing the data error rate by 30%.', ['marsh', 'skills']],
    ['allcargo', '#item-allcargo', 'Allcargo', 'What did he do at Allcargo?', ['allcargo', 'visitor', 'warehouses?', 'dataverse', 'business excellence'],
      'At Allcargo (Dec 2023 - Jun 2024) he ran ethnographic research across 12+ warehouses and built a Power Apps Visitor Management System with Dataverse and Power Automate for 2,000+ monthly visitors. It eliminated manual entry errors, and he won the Top-flight Performer Award for FY 2023-24.', ['award', 'tvastra']],
    ['tvastra', '#item-tvastra', 'Tvastra', 'What is Tvastra?', ['tvastra', 'co-?found', 'start-?up', 'entrepreneur', '\\bceo\\b', 'vendors?', 'consumer product', 'brand loyalty'],
      'Tvastra is the company he co-founded and ran as CEO (Feb 2023 - Jan 2024). He evaluated 100+ vendors, launched a consumer product line that reached profitability within 6 months, and led a 5-member team that improved delivery speed by 35%.', ['allcargo', 'highlights']],
    ['npcil', '#item-npcil', 'NPCIL', 'What did he do at the Nuclear Power Corporation?', ['nuclear', 'npcil', 'npci', 'android', 'hardening', 'remote admin', 'security'],
      'At the Nuclear Power Corporation of India (Jul 2023 - Nov 2023) he built a Remote Admin Utility and Android OS Hardening Tool deployed across 50+ devices, with 4+ automated security modules that cut manual security audit effort by an estimated 50%.', ['work']],
    ['glossa', '#item-glossaread', 'Glossaread', 'What did he do at Glossaread?', ['glossa', 'lead conversion', 'content assets', 'competitive analysis', 'product marketing'],
      'At Glossaread (Apr 2022 - Jun 2022) he analyzed 20+ competitors to find market positioning gaps and produced 10+ content assets that improved inbound lead conversion by 20%.', ['acadza', 'work']],
    ['acadza', '#item-acadza', 'Acadza', 'What did he do at Acadza?', ['acadza', 'edtech', 'professors', 'junior project'],
      'At Acadza (Jan 2021 - Feb 2021) he coordinated user research and usability testing with 6 designers and 20+ professors for an EdTech platform serving 500+ students, and prioritized 15+ UX issues resolved before launch.', ['glossa', 'work']],
    ['highlights', '#experience', 'Experience', 'What are his biggest results?', ['biggest', 'achievements?', 'best results?', 'accomplish', 'impact', 'highlights?', 'proud', 'results?\\b', 'metrics', 'numbers'],
      'Highlights: automations that cut processing time by an estimated 60% (Marsh), a 30% lower data error rate across 500K+ records (Marsh), a consumer product line profitable within 6 months (Tvastra), a visitor system for 2,000+ monthly visitors (Allcargo), a 111-agent enterprise AI proposal (OCIO) and the Top-flight Performer Award.', ['marsh', 'tvastra', 'award']],
    ['projects', '#projects', 'Projects', 'What projects has he built?', ['projects?\\b', 'portfolio', '~build', '~built', '~made', '~created', 'case stud', 'side projects?', 'academic projects?'],
      function () { return 'Projects: ' + lists.proj.join('; ') + '. Code on GitHub: ' + lists.repos.join(', ') + '.'; }, ['chip', 'uber', 'usdc']],
    ['gmm', '#item-gies-marketing-matrix', 'Project', 'What is the Gies Marketing Matrix?', ['marketing matrix', 'buildathon', 'hackathon', 'campaign tracker', 'media plan'],
      'At a 24-hour buildathon he built an AI agent in Microsoft Copilot Studio plus an automated Excel campaign tracker (Power Automate) for multi-campaign marketing coordination. It parses agency media plans into tasks, and he demoed it end to end in under 2 minutes.', ['projects', 'agents']],
    ['uber', '#item-empathetic-uber', 'Project', 'What is Empathetic Uber?', ['uber', 'accessib', 'senior ride', 'elderly', 'familiar drivers', 'ride replay', 'figma prototype', 'caregiver'],
      'Empathetic Uber is a rideshare redesign for senior riders. He ran 5 user interviews (ages 50-82), found 4 research themes and 5 design principles, and designed Familiar Drivers and Ride Replay in Figma, validated in a second round of testing.', ['hearth', 'projects']],
    ['hearth', '#item-hearth', 'Project', 'What is HEARTH?', ['hearth', 'astronaut', 'isolation', 'habituation', 'sensory'],
      'HEARTH (Home Environment Analog for Remote Terrestrial Habituation) reframes astronaut isolation as a sensory-displacement problem. He used Claude to rapidly prototype a 5-module concept (Presence, Acoustic, Temporal, Olfactory, Archive) in one class cycle.', ['uber', 'projects']],
    ['chip', '#item-chip-race', 'Project', 'What is The Chip Race?', ['semiconductor', 'chip race', 'chips act', '800 billion', 'asia pacific', 'billings'],
      'The Chip Race analyzes 40 years of semiconductor billings across 4 regions with Python and 5 Tableau visualizations, plus a Claude chatbot. It finds Asia Pacific overtook the Americas in 2001 and leads by $183B a year, versus the $52.7B CHIPS Act investment.', ['dash', 'usdc']],
    ['usdc', '#item-usdc', 'Project', 'What is the USDC treasury analysis?', ['usdc', 'stablecoin', 'blockchain', 'treasury', 'knime', 'dune', 'ethereum', 'gas'],
      'He built a KNIME ELT pipeline with 6 SQL queries (CTEs, window functions, INNER JOINs) to evaluate USDC for $1M+ cross-border treasury payments on Ethereum, confirming 500K-700K daily transactions and sub-$1 gas costs.', ['chip', 'projects']],
    ['lyrics', '#item-lyrics', 'Project', 'What is the lyrics analysis?', ['lyric', 'verse to the crowd', 'vader', 'sentiment', 'songs?', 'artists?', 't-?tests?', 'tf-?idf', 'blog'],
      'He analyzed 425 songs across 4 artists with VADER sentiment scoring and TF-IDF, and ran pre/post career-event t-tests. 2 of 4 artists showed measurable lyrical shifts. He published the findings as a blog post.', ['projects', 'chip']],
    ['signal', '#repo-signal', 'Code', 'What is signal-to-roadmap?', ['signal-?to-?roadmap', 'roadmap', 'customer feedback', 'langgraph', 'mcp server', 'multi-?agent system'],
      'signal-to-roadmap is a multi-agent system that turns customer feedback into prioritized product recommendations, using an MCP server and LangGraph (Python).', ['netwatch', 'github']],
    ['netwatch', '#repo-netwatch', 'Code', 'What is NetWatch?', ['netwatch', 'anomaly', 'fraud', 'takeover', 'ensemble'],
      'NetWatch is a distributed anomaly detection system that uses ensemble ML across parallel workers to catch account takeovers and content fraud (Python).', ['signal', 'github']],
    ['marimo', '#repo-marimo', 'Code', 'What is the marimo fork?', ['marimo', 'notebook'],
      'marimo is a fork of marimo-team/marimo, a reactive Python notebook with SQL querying and git versioning.', ['github']],
    ['karanbot', '#repo-karan-bot', 'Code', 'What is Karan-Bot?', ['karan-?bot'],
      'Karan-Bot is an HTML project in his GitHub. The repository has the details.', ['github']],
    ['dash', '#dashboards', 'Dashboards', 'Which Tableau dashboards has he made?', ['~dashboards?', 'tableau', 'visuali[sz]ations?', 'data stor(y|ies)', 'viz\\b'],
      function () { return 'Four Tableau dashboards: ' + lists.dash.join('; ') + '.'; }, ['chip', 'chicago', 'tools']],
    ['chicago', '#dash-chicago', 'Dashboard', 'What is the Chicago arrests dashboard?', ['chicago', 'arrests?', 'drug', 'crime'],
      '"In Chicago, 1 in 4 Arrests Were Drug-Related (2014-2017)" is a Tableau dashboard on Chicago arrest records and the share that were drug-related.', ['dash']],
    ['sales', '#dash-sales', 'Dashboard', 'What is the sales story?', ['sales', 'history of a company', 'shifting'],
      '"Sales: Shifting History of a Company" is a Tableau story on how a company\'s sales changed over time.', ['dash']],
    ['pizza', '#dash-dominos', 'Dashboard', 'What is the Domino\'s vs Papa John\'s dashboard?', ['domino', 'papa john', 'pizza', 'search trends'],
      '"Domino\'s vs. Papa John\'s: Search Trends, Last 30 Days" is a Tableau dashboard comparing search interest for the two chains.', ['dash']],
    ['skills', '#skills', 'Skills', 'What are his skills?', ['~skills?\\b', 'skill set', 'tech stack', 'technolog', 'proficien', 'know how'],
      function () { return lists.skills.map(function (s) { var p = s.split(': '); return p[0] + ': ' + p[1].split(', ').slice(0, 7).join(', '); }).join('\n'); }, ['strong', 'langs', 'tools']],
    ['strong', '#skills', 'Skills', 'What is he strongest at?', ['strongest', 'best skills?', 'good at', 'expertise', 'specializ', 'top skills', 'core skills', 'forte'],
      'SQL and Python for data, Tableau and Power BI for dashboards, and Microsoft Copilot Studio and Power Automate for AI agents and automation.', ['skills', 'highlights']],
    ['langs', '#skills', 'Skills', 'Which programming languages does he use?', ['programming', 'languages?\\b', 'coding', 'code in', 'python', 'java\\b', 'javascript', '\\bsql\\b', 'database'],
      'Python (pandas), SQL (CTEs, window functions), Java, JavaScript, HTML, PHP, C and XML, with MySQL, Oracle Express 11g and Dataverse for data.', ['tools', 'ai']],
    ['tools', '#skills', 'Skills', 'Which BI and analytics tools does he use?', ['\\bbi\\b', 'analytics tools?', 'power bi', 'tableau', '\\bsas\\b', 'weka', 'knime', 'tools?\\b', 'software'],
      'Power BI, Tableau, SAS Visual Analytics, Weka and KNIME for dashboards and visualization, plus Power Automate, Power Apps and SharePoint integration for automation.', ['langs', 'dash']],
    ['ai', '#skills', 'Skills', 'What AI skills does he have?', ['ai skills', 'llm', 'prompt', 'langgraph', '\\bmcp\\b', 'azure', 'claude', 'generative'],
      'Microsoft Copilot Studio, multi-agent orchestration, agent testing and QA, prompt engineering, Claude AI, MCP, LangGraph and Azure AI Services.', ['agents', 'skills']],
    ['design', '#skills', 'Skills', 'What design and UX skills does he have?', ['design tools?', 'figma', 'miro', 'prototyp', '\\bux\\b', 'user research', 'usability', 'product (management|strategy|manager)', 'journey', 'persona', 'human-?centered'],
      'Figma and Miro for design, with user research, usability testing, journey and affinity mapping, personas, prototyping, human-centered design, product strategy and roadmap planning.', ['uber', 'hearth']],
    ['hire', '#contact', 'Contact', 'Is he open to work?', ['hire', 'hiring', 'available', 'availability', 'open to', 'looking for', 'job search', 'visa', 'sponsor', 'salary', 'relocat', 'resume', '\\bcv\\b', 'notice period', 'start date'],
      'The site does not cover availability, visas or salary. The best way to ask is by email: kkj3@illinois.edu.', ['contact']],
    ['personal', '#about', 'About', null, ['phone', 'hobb', 'interests?\\b', '\\bage\\b', 'married', 'family', 'born', 'birthday', 'nationality', 'citizen', 'religion', 'girlfriend', 'address'],
      'The site does not cover personal details. You can email kkj3@illinois.edu.', ['contact']],
    ['bot', '#about', 'About', 'What is this chat?', ['this (chat|bot|assistant)', 'chatbot', 'who are you', 'what can you do', '^help\\b', 'what (can|should) i ask', 'how (can|do) (you|i)', 'are you (an? )?(ai|bot|human)', 'how do you work'],
      'I am a simple assistant built into this page. I answer only from what is written on this site, and I use no AI service.', ['intro']]
  ];
  var byId = {};
  A.forEach(function (e) { byId[e[0]] = e; });
  var START = ['projects', 'work', 'agents', 'skills', 'gpa', 'dash', 'marsh', 'contact'];

  /* ---------- 3. Understanding the question ---------- */
  var vocab = {}, core = {};
  function addVocab(s, isCore) { (s.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || []).forEach(function (w) { w = w.replace(/[.-]+$/, ''); vocab[w] = (vocab[w] || 0) + 1; if (isCore) core[w] = 1; }); }
  units.forEach(function (u) { addVocab(u.ctx + ' ' + u.text); });
  A.forEach(function (e) { addVocab(typeof e[5] === 'function' ? '' : e[5]); e[4].forEach(function (k) { addVocab(k.replace(/\\[a-z]/gi, ' ').replace(/[^a-z\s]/gi, ' '), true); }); addVocab(e[3] || '', true); });
  addVocab('where which there these those other people studied worked built companies company education projects achievements experience skills dashboards university degree courses internship about tell does what when how many much have latest current contact email resume', true);
  var vocabList = Object.keys(vocab);
  function lev(a, b, max) { /* optimal string alignment: a swap of two letters counts as one edit */
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  function fixTypos(q) {
    return q.replace(/[a-z][a-z0-9]{3,}/g, function (w) {
      if (vocab[w] || vocab[w + 's'] || vocab[w.replace(/s$/, '')]) return w;
      var max = w.length >= 6 ? 2 : 1, best = null, bd = 9, bc = 1, bf = 0;
      for (var i = 0; i < vocabList.length; i++) {
        var v = vocabList[i];
        if (v[0] !== w[0] && v[1] !== w[1]) continue;
        var d = lev(w, v, max);
        if (d > max) continue;
        var cr = core[v] ? 0 : 1, f = vocab[v];
        if (d < bd || (d === bd && (cr < bc || (cr === bc && f > bf)))) { bd = d; bc = cr; bf = f; best = v; }
      }
      return best || w;
    });
  }
  var STOP = 'a an the is are was were be been of in on at to for from and or with about what which who whom how did does do his he him karan jhaveri tell me any have has had can could would you your it its this that there their they them as by into than then also more most some such please'.split(' ');
  function toks(s) { return s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/\s+/).filter(function (w) { return w && STOP.indexOf(w) < 0; }).map(function (w) { return w.replace(/(ing|es|s)$/, ''); }); }
  var rx = {};
  function R(s) { return rx[s] || (rx[s] = new RegExp(/^[a-z0-9]/.test(s) ? '\\b' + s : s)); }

  function scoreEntries(l) {
    var out = [];
    A.forEach(function (e) {
      var s = 0;
      e[4].forEach(function (k) { var w = 1; if (k[0] === '!') { w = 2.2; k = k.slice(1); } else if (k[0] === '~') { w = 0.45; k = k.slice(1); } var m = l.match(R(k)); if (m) s += w * (1 + Math.min(m[0].length, 14) / 14); });
      if (s > 0) out.push({ e: e, s: s });
    });
    return out.sort(function (a, b) { return b.s - a.s; });
  }

  function skillCheck(q, l) {
    if (!/^(does|do|can|is|has|have|will|did)\b/.test(l)) return null;
    var m = l.match(/(?:know|knows|use|uses|used|familiar with|experience (?:with|in)|skilled in|proficient in|work with|worked with|worked on|has|have|good at)\s+(.+?)\??$/);
    if (!m) return null;
    var tk = toks(m[1]);
    if (!tk.length) return null;
    var name = m[1].replace(/\?$/, '').trim(); var oi = q.toLowerCase().indexOf(name); if (oi >= 0) name = q.slice(oi, oi + name.length);
    var hit = units.filter(function (u) { return u.label === 'Skills' && tk.every(function (w) { return (u.text + ' ' + u.ctx).toLowerCase().indexOf(w) >= 0; }); })[0];
    if (hit) return { text: 'Yes. ' + name + ' is listed under his ' + hit.ctx + ' skills.', href: '#skills', label: 'Skills' };
    hit = units.filter(function (u) { return tk.every(function (w) { return (u.text + ' ' + u.ctx).toLowerCase().indexOf(w) >= 0; }); })[0];
    if (hit) return { text: 'Yes. ' + name + ' appears in his work: ' + clip(hit.text, 190) + ' (' + hit.ctx + ')', href: hit.href, label: hit.label };
    return { text: 'I do not see ' + name + ' on this site. His full list is in the Skills section.', href: '#skills', label: 'Skills' };
  }
  function clip(t, n) { return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }

  function search(l) {
    var qt = toks(l).filter(function (w) { return w.length > 1; });
    if (!qt.length) return null;
    var N = units.length, df = {};
    qt.forEach(function (w) { df[w] = units.filter(function (u) { return (u.ctx + ' ' + u.text).toLowerCase().indexOf(w) >= 0; }).length; });
    var sc = units.map(function (u) {
      var hay = (u.ctx + ' ' + u.text).toLowerCase(), s = 0, nm = 0;
      qt.forEach(function (w) { if (df[w] && hay.indexOf(w) >= 0) { nm++; var idf = Math.log(1 + N / df[w]); s += idf + (u.ctx.toLowerCase().indexOf(w) >= 0 ? idf * 0.6 : 0); } });
      return { u: u, s: s - u.text.length / 4000, nm: nm };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    if (!sc.length || sc[0].s < 2.6 || sc[0].nm < Math.min(2, qt.length)) return null;
    var u = sc[0].u;
    return { text: clip(u.text, 260) + (u.ctx && u.text.indexOf(u.ctx) < 0 ? '  (' + u.ctx + ')' : ''), href: u.href, label: u.label };
  }

  function related(q, skipId) {
    var qt = toks(q), out = [];
    A.forEach(function (e) {
      if (!e[3] || e[0] === skipId) return;
      var s = 0, et = toks(e[3] + ' ' + e[4].join(' ').replace(/\\[a-z]|[()?|]/g, ' '));
      qt.forEach(function (w) { if (et.indexOf(w) >= 0) s += 1; });
      if (s > 0) out.push({ id: e[0], s: s });
    });
    return out.sort(function (a, b) { return b.s - a.s; }).slice(0, 3).map(function (x) { return x.id; });
  }

  function answer(q) {
    var raw = q.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
    var r = resolve(q, raw);
    if (r.miss || r.weak) {
      var fixed = fixTypos(raw);
      if (fixed !== raw) { var r2 = resolve(q, fixed); if (!r2.miss && !(r2.weak && !r.miss)) return r2; }
    }
    return r;
  }
  function resolve(q, l) {
    if (/^(hi|hello|hey|yo|hola|good (morning|afternoon|evening))\b/.test(l) && l.split(' ').length < 4)
      return { text: 'Hi! Ask me about Karan\'s experience, projects, skills, education or dashboards, or pick a question below.', follow: START.slice(0, 4) };
    if (/^(thanks|thank you|thx|ty|great|cool|awesome|nice)\b/.test(l))
      return { text: 'You are welcome. Anything else you would like to know?', follow: ['projects', 'work', 'contact'] };
    var sk = skillCheck(q, l);
    if (sk) { sk.follow = ['skills', 'projects', 'work']; return sk; }
    var dateIntent = /\b(when|dates?|how long|what year|duration|start(ed)?|end(ed)?|period)\b/.test(l);
    if (dateIntent) {
      var hdr = units.filter(function (u) { return u.hdr; }).map(function (u) {
        var s = 0; toks(l).forEach(function (w) { if ((u.ctx + ' ' + u.text).toLowerCase().indexOf(w) >= 0) s++; });
        return { u: u, s: s };
      }).sort(function (a, b) { return b.s - a.s; });
      if (hdr.length && hdr[0].s > 0 && /\b(work|worked|job|role|intern|stay|employ)/.test(l) || (hdr.length && hdr[0].s > 1))
        return { text: hdr[0].u.text, href: hdr[0].u.href, label: 'Experience', follow: ['work', 'marsh'] };
    }
    var ranked = scoreEntries(l);
    if (ranked.length && ranked[0].s >= 0.6) {
      var e = ranked[0].e, a = typeof e[5] === 'function' ? e[5]() : e[5];
      var follow = (e[6] || []).slice();
      if (ranked[1] && ranked[1].s >= ranked[0].s * 0.7 && ranked[1].e[3] && follow.indexOf(ranked[1].e[0]) < 0) follow.unshift(ranked[1].e[0]);
      return { text: a, href: e[1], label: e[2], follow: follow.slice(0, 3), id: e[0] };
    }
    var s = search(l);
    if (s) { s.follow = related(l).slice(0, 3); s.weak = true; return s; }
    var rel = related(l);
    return { text: 'I could not find that on this site. Here are some things I can answer:', follow: (rel.length ? rel : START.slice(0, 4)).slice(0, 4), miss: true };
  }

  /* ---------- 4. Chat window ---------- */
  var busy = false;
  function el(tag, cls, text) { var d = document.createElement(tag); if (cls) d.className = cls; if (text) d.textContent = text; return d; }
  function clearChips() { Array.prototype.slice.call(log.querySelectorAll('.chips')).forEach(function (n) { n.remove(); }); }
  function chips(ids, host) {
    var box = el('div', 'chips');
    ids.forEach(function (id) {
      var e = byId[id]; if (!e || !e[3]) return;
      var b = el('button', null, e[3]); b.type = 'button';
      b.addEventListener('click', function () { ask(e[3]); });
      box.appendChild(b);
    });
    if (box.children.length) host.appendChild(box);
  }
  function goTo(href) {
    var t = document.querySelector(href);
    if (!t) return;
    if (window.innerWidth < 700) closeChat(true);
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
    setTimeout(function () { t.classList.remove('flash'); }, 2400);
    if (history.replaceState) { try { history.replaceState(null, '', href); } catch (e) {} }
  }
  function say(who, text, link) {
    var d = el('div', 'msg ' + who);
    d.appendChild(el('div', 'body', text));
    if (link && link.href && document.querySelector(link.href)) {
      var a = el('a', 'seclink', 'See ' + link.label + ' ↓'); a.href = link.href;
      a.addEventListener('click', function (ev) { ev.preventDefault(); goTo(link.href); });
      d.appendChild(a);
    }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  function ask(q) {
    q = q.trim(); if (!q || busy) return; busy = true;
    clearChips(); say('me', q);
    var r = answer(q);
    var d = say('bot', r.text, r);
    chips(r.follow || [], log);
    log.scrollTop = log.scrollHeight; busy = false;
  }
  function openChat() {
    panel.hidden = false; fab.hidden = true;
    if (!log.children.length) {
      say('bot', 'Hi, I can answer questions about Karan\'s experience, projects, skills, education and dashboards. Pick one or type your own.');
      chips(START, log);
    }
    if (window.innerWidth >= 700) input.focus();
  }
  function closeChat(quiet) { panel.hidden = true; fab.hidden = false; if (!quiet) fab.focus(); }
  document.getElementById('chat-form').addEventListener('submit', function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); });
  fab.addEventListener('click', openChat);
  document.getElementById('chat-close').addEventListener('click', function () { closeChat(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closeChat(); });
  if (chipsBox) chipsBox.hidden = true;
  window.__karanBot = { answer: answer, units: units, fix: fixTypos };
})();
