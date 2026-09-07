const bcrypt = require('bcryptjs');

async function runSeed(pool) {
  console.log('[Seed] Starting comprehensive NDMU database seeding...');

  // 1. Seed Departments & Colleges
  const departments = [
    { name: 'Management Information Systems (MIS)', code: 'MIS', type: 'office' },
    { name: 'College of Computer Studies', code: 'CCS', type: 'college' },
    { name: 'College of Engineering', code: 'COE', type: 'college' },
    { name: 'College of Business Administration', code: 'CBA', type: 'college' },
    { name: 'College of Education', code: 'CED', type: 'college' },
    { name: 'College of Arts and Sciences', code: 'CAS', type: 'college' },
    { name: 'College of Health Sciences', code: 'CHS', type: 'college' },
    { name: 'Integrated Basic Education Department', code: 'IBED', type: 'college' },
    { name: 'Office of the University President', code: 'OP', type: 'office' },
    { name: 'Office of the Registrar', code: 'REG', type: 'office' },
    { name: 'Finance & Accounting Office', code: 'FAO', type: 'office' },
    { name: 'Human Resource Development Office', code: 'HRDO', type: 'office' },
    { name: 'University Library', code: 'LIB', type: 'unit' },
    { name: 'Physical Plant & General Services', code: 'PPGS', type: 'office' },
  ];

  for (const dept of departments) {
    await pool.query(
      'INSERT INTO departments (name, code, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [dept.name, dept.code, dept.type]
    );
  }
  console.log('[Seed] Departments and colleges seeded.');

  // 2. Seed Teams
  const teams = [
    { name: 'Network & Infrastructure Team', description: 'Campus Wi-Fi, LAN, fiber backbone, routers, and switches' },
    { name: 'Systems & Web Applications Team', description: 'EIS, Schoology LMS, SATP, SMS, and database operations' },
    { name: 'Hardware & Desktop Support Team', description: 'Workstations, laptops, printers, scanners, and OS maintenance' },
    { name: 'User Accounts & Access Support', description: 'Google Workspace, password resets, role permissions, and onboarding' },
  ];

  for (const team of teams) {
    await pool.query(
      'INSERT INTO teams (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description)',
      [team.name, team.description]
    );
  }
  console.log('[Seed] Teams seeded.');

  // 3. Seed Categories & Subcategories with Dynamic Form Schemas
  const catalog = [
    {
      name: 'Accounts & Access',
      description: 'Institutional email, Schoology, EIS, SATP, password reset',
      icon: 'account_circle',
      subcategories: [
        {
          name: 'Institutional Email Account',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'employee_id', label: 'Employee / Student ID Number', type: 'text', required: true, placeholder: 'e.g. EMP-2026-0012 or STU-2024-0089' },
            { id: 'full_name', label: 'Full Legal Name', type: 'text', required: true, placeholder: 'First Name, Middle Name, Last Name' },
            { id: 'department', label: 'College / Department / Office', type: 'text', required: true },
            { id: 'backup_email', label: 'Personal Recovery Email', type: 'email', required: true, placeholder: 'name@gmail.com' },
            { id: 'contact_number', label: 'Active Contact Number', type: 'tel', required: true },
          ],
        },
        {
          name: 'Schoology Account Setup',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'employee_id', label: 'Employee / Faculty ID', type: 'text', required: true },
            { id: 'full_name', label: 'Faculty Name', type: 'text', required: true },
            { id: 'college_dept', label: 'College / Academic Department', type: 'text', required: true },
            { id: 'subjects_handled', label: 'Subjects / Course Codes Handled', type: 'textarea', required: true, placeholder: 'e.g. CS101, IT202, Web Development 1' },
            { id: 'institutional_email', label: 'Institutional Email (@ndmu.edu.ph)', type: 'email', required: true },
          ],
        },
        {
          name: 'EIS Faculty/Student Portal Access',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'id_number', label: 'ID Number', type: 'text', required: true },
            { id: 'role_type', label: 'Portal Type', type: 'select', options: ['Faculty Grading Portal', 'Student Portal', 'Registrar / Admin Module', 'Dean / Dept Head Review'], required: true },
            { id: 'department', label: 'College / Office', type: 'text', required: true },
            { id: 'justification', label: 'Access Justification / Remarks', type: 'textarea', required: false },
          ],
        },
        {
          name: 'Password Reset Request',
          type: 'service_request',
          priority: 'high',
          form_schema: [
            { id: 'account_type', label: 'System / Account', type: 'select', options: ['Google Institutional Email', 'Schoology LMS', 'EIS Portal', 'Windows Workstation'], required: true },
            { id: 'username_email', label: 'Username or Email Address', type: 'text', required: true },
            { id: 'verification_id', label: 'University ID Number', type: 'text', required: true },
            { id: 'phone_sms', label: 'Mobile Number for Temporary Password', type: 'tel', required: true },
          ],
        },
        {
          name: 'SATP Account Assistance',
          type: 'service_request',
          priority: 'low',
          form_schema: [
            { id: 'id_number', label: 'Employee ID', type: 'text', required: true },
            { id: 'office', label: 'Department / Office', type: 'text', required: true },
            { id: 'issue_details', label: 'Specific Module / Issue Details', type: 'textarea', required: true },
          ],
        },
      ],
    },
    {
      name: 'Network',
      description: 'Wi-Fi, LAN, internet, access points',
      icon: 'wifi',
      subcategories: [
        {
          name: 'Campus Wi-Fi Connectivity Issue',
          type: 'incident',
          priority: 'high',
          form_schema: [
            { id: 'building', label: 'Building Name', type: 'select', options: ['Main Building', 'CCS Building', 'Engineering Building', 'Gymnasium', 'Student Center', 'Library', 'IBED Complex', 'Administration Building'], required: true },
            { id: 'room_office', label: 'Room / Floor / Area', type: 'text', required: true, placeholder: 'e.g. 2nd Floor Hallway / Room 204' },
            { id: 'device_type', label: 'Device Encountering Issue', type: 'select', options: ['Laptop (Windows/Mac)', 'Mobile Phone (Android/iOS)', 'Tablet', 'Other'], required: true },
            { id: 'ssid_network', label: 'Wi-Fi Network Name (SSID)', type: 'select', options: ['NDMU-Faculty', 'NDMU-Student', 'NDMU-Guest', 'Other'], required: true },
            { id: 'error_symptom', label: 'Symptom', type: 'select', options: ['Cannot connect / Invalid password', 'Connected but No Internet', 'Weak Signal / Dropping', 'Slow speed'], required: true },
          ],
        },
        {
          name: 'LAN Cable / Office Wallport Issue',
          type: 'incident',
          priority: 'medium',
          form_schema: [
            { id: 'building', label: 'Building', type: 'text', required: true },
            { id: 'room_office', label: 'Room / Office', type: 'text', required: true },
            { id: 'port_number', label: 'Wallport Number (if labeled)', type: 'text', required: false },
            { id: 'description', label: 'Problem Details', type: 'textarea', required: true },
          ],
        },
        {
          name: 'New Network Port Installation',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'office_location', label: 'Office / Department Location', type: 'text', required: true },
            { id: 'num_ports', label: 'Number of Drops / Ports Needed', type: 'number', required: true },
            { id: 'purpose', label: 'Purpose (e.g. New PC, Printer, Laboratory)', type: 'textarea', required: true },
          ],
        },
        {
          name: 'Guest Wi-Fi Voucher Request',
          type: 'service_request',
          priority: 'low',
          form_schema: [
            { id: 'event_name', label: 'Event / Visitor Purpose', type: 'text', required: true },
            { id: 'num_guests', label: 'Estimated Number of Guests', type: 'number', required: true },
            { id: 'start_date', label: 'Start Date & Time', type: 'text', required: true },
            { id: 'end_date', label: 'End Date & Time', type: 'text', required: true },
          ],
        },
      ],
    },
    {
      name: 'Hardware & Devices',
      description: 'Desktop, laptop, printer, scanner',
      icon: 'computer',
      subcategories: [
        {
          name: 'Desktop PC Malfunction',
          type: 'incident',
          priority: 'medium',
          form_schema: [
            { id: 'asset_tag', label: 'Equipment Asset Tag / Serial No.', type: 'text', required: false, placeholder: 'e.g. NDMU-PC-2024-045' },
            { id: 'location', label: 'Building & Room', type: 'text', required: true },
            { id: 'symptoms', label: 'Hardware Symptom', type: 'select', options: ['No power / Will not turn on', 'Beeping / Blue screen', 'Overheating / Loud fan', 'Monitor display blank', 'Keyboard / Mouse unresponsive'], required: true },
            { id: 'description', label: 'Additional Observations', type: 'textarea', required: true },
          ],
        },
        {
          name: 'Printer Setup & Troubleshooting',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'printer_model', label: 'Printer Brand & Model', type: 'text', required: true, placeholder: 'e.g. Epson L3210, HP LaserJet Pro' },
            { id: 'location', label: 'Office / Department', type: 'text', required: true },
            { id: 'request_type', label: 'Service Needed', type: 'select', options: ['Configure Network/Shared Printer', 'Toner/Ink Replenishment', 'Paper Jam / Physical Error', 'Driver Installation'], required: true },
          ],
        },
      ],
    },
    {
      name: 'Software & Systems',
      description: 'Installation, licensing, application problems, EIS, Schoology',
      icon: 'code',
      subcategories: [
        {
          name: 'Software Installation Request',
          type: 'service_request',
          priority: 'low',
          form_schema: [
            { id: 'software_name', label: 'Software / Program Requested', type: 'text', required: true, placeholder: 'e.g. SPSS, AutoCAD, Visual Studio Code, Zoom' },
            { id: 'location_pc', label: 'Laboratory / Office Computer Location', type: 'text', required: true },
            { id: 'academic_purpose', label: 'Academic or Office Purpose', type: 'textarea', required: true },
          ],
        },
        {
          name: 'EIS / Schoology / SATP System Outage',
          type: 'incident',
          priority: 'critical',
          form_schema: [
            { id: 'affected_system', label: 'System Encountering Error', type: 'select', options: ['Schoology LMS', 'EIS Enterprise Portal', 'SATP Enrollment System', 'SMS / KumoSoft Grading'], required: true },
            { id: 'error_message', label: 'Error Message Displayed', type: 'text', required: true, placeholder: 'e.g. HTTP 500, Database connection timeout' },
            { id: 'scope_affected', label: 'Scope Affected', type: 'select', options: ['All Students & Faculty (Entire Campus)', 'Entire College / Department', 'Multiple Faculty Members', 'Single User'], required: true },
            { id: 'details', label: 'Detailed Description & Steps to Reproduce', type: 'textarea', required: true },
          ],
        },
      ],
    },
    {
      name: 'Multimedia & AV Support',
      description: 'Projector, display, AV equipment in auditoriums and classrooms',
      icon: 'videocam',
      subcategories: [
        {
          name: 'Classroom Projector / Smart TV Setup',
          type: 'service_request',
          priority: 'medium',
          form_schema: [
            { id: 'venue', label: 'Classroom / Venue', type: 'text', required: true, placeholder: 'e.g. CCS Lab 3, Engineering Amphitheater' },
            { id: 'date_time', label: 'Date & Time Needed', type: 'text', required: true, placeholder: 'e.g. Monday Sept 8, 8:00 AM - 11:00 AM' },
            { id: 'equipment_list', label: 'Equipment Needed', type: 'select', options: ['LCD Projector & Screen', 'HDMI / VGA Cable Adapter', 'Wireless Microphones & Speaker', 'Full Event Audio-Visual Setup'], required: true },
          ],
        },
      ],
    },
  ];

  for (const cat of catalog) {
    const [res] = await pool.query(
      'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description), icon=VALUES(icon)',
      [cat.name, cat.description, cat.icon]
    );

    let categoryId = res.insertId;
    if (!categoryId) {
      const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [cat.name]);
      if (existing.length > 0) categoryId = existing[0].id;
    }

    if (categoryId && cat.subcategories) {
      for (const sub of cat.subcategories) {
        await pool.query(
          `INSERT INTO subcategories (category_id, name, description, default_type, default_priority, form_schema)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE default_type=VALUES(default_type), default_priority=VALUES(default_priority), form_schema=VALUES(form_schema)`,
          [categoryId, sub.name, sub.name, sub.type, sub.priority, JSON.stringify(sub.form_schema)]
        );
      }
    }
  }
  console.log('[Seed] Categories and dynamic service catalog seeded.');

  // 4. Seed Users (Admin, Team Leader, Technicians, Requestors)
  const adminPass = await bcrypt.hash('admin123', 10);
  const leadPass = await bcrypt.hash('lead123', 10);
  const techPass = await bcrypt.hash('tech123', 10);
  const userPass = await bcrypt.hash('user123', 10);

  const [teamRows] = await pool.query('SELECT id, name FROM teams');
  const netTeamId = teamRows.find((t) => t.name.includes('Network'))?.id || null;
  const sysTeamId = teamRows.find((t) => t.name.includes('Systems'))?.id || null;
  const hwTeamId = teamRows.find((t) => t.name.includes('Hardware'))?.id || null;

  const users = [
    {
      email: 'admin@ndmu.edu.ph',
      password_hash: adminPass,
      full_name: 'Engr. Nelson Tan (MIS Director)',
      id_number: 'EMP-00101',
      role: 'admin',
      dept: 'MIS',
      team_id: null,
      phone: '09171234567',
    },
    {
      email: 'lead.network@ndmu.edu.ph',
      password_hash: leadPass,
      full_name: 'Engr. Roberto Gomez (Network Team Lead)',
      id_number: 'EMP-00105',
      role: 'team_leader',
      dept: 'MIS',
      team_id: netTeamId,
      phone: '09175551234',
    },
    {
      email: 'tech1@ndmu.edu.ph',
      password_hash: techPass,
      full_name: 'Mark Dela Cruz (Network Specialist)',
      id_number: 'EMP-00102',
      role: 'technician',
      dept: 'MIS',
      team_id: netTeamId,
      phone: '09187654321',
    },
    {
      email: 'tech2@ndmu.edu.ph',
      password_hash: techPass,
      full_name: 'Sarah Santos (Hardware & Systems Tech)',
      id_number: 'EMP-00103',
      role: 'technician',
      dept: 'MIS',
      team_id: hwTeamId,
      phone: '09191122334',
    },
    {
      email: 'faculty@ndmu.edu.ph',
      password_hash: userPass,
      full_name: 'Prof. Juan Luna (CCS Faculty)',
      id_number: 'EMP-00204',
      role: 'requestor',
      dept: 'CCS',
      team_id: null,
      phone: '09205556677',
    },
    {
      email: 'student@ndmu.edu.ph',
      password_hash: userPass,
      full_name: 'Maria Clara (BSIT Student)',
      id_number: 'STU-2024-0089',
      role: 'requestor',
      dept: 'CCS',
      team_id: null,
      phone: '09223334455',
    },
  ];

  for (const u of users) {
    const [deptRows] = await pool.query('SELECT id, name FROM departments WHERE code = ?', [u.dept]);
    const deptId = deptRows.length > 0 ? deptRows[0].id : null;
    const deptName = deptRows.length > 0 ? deptRows[0].name : u.dept;

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, id_number, role, department_id, department_name, team_id, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role), department_id=VALUES(department_id), department_name=VALUES(department_name), team_id=VALUES(team_id)`,
      [u.email, u.password_hash, u.full_name, u.id_number, u.role, deptId, deptName, u.team_id, u.phone]
    );
  }
  console.log('[Seed] Default users with roles seeded.');

  // 5. Seed Knowledge Base Articles
  const kbArticles = [
    {
      title: 'How to Connect to NDMU Campus Wi-Fi (Students & Faculty)',
      slug: 'how-to-connect-ndmu-wifi',
      category: 'Network',
      summary: 'Instructions for connecting your laptops, Android, and iOS devices to NDMU-Student and NDMU-Faculty Wi-Fi networks.',
      content: `### Connecting to NDMU Campus Wi-Fi
1. Turn on Wi-Fi on your device.
2. Select **NDMU-Student** (for students) or **NDMU-Faculty** (for employees).
3. In the authentication prompt, enter:
   - **EAP Method**: PEAP
   - **Phase 2 Authentication**: MSCHAPV2
   - **CA Certificate**: Do not validate / Trust
   - **Identity**: Your institutional email (e.g. \`j.luna@ndmu.edu.ph\`)
   - **Password**: Your NDMU account password
4. Tap **Connect**.

If you receive a certificate warning, accept and proceed. For guest access, please request a guest voucher from your event organizer.`,
    },
    {
      title: 'Step-by-Step Guide: Resetting Your Institutional Google Password',
      slug: 'reset-institutional-google-password',
      category: 'Accounts & Access',
      summary: 'How to reset or recover your @ndmu.edu.ph Google Workspace account password.',
      content: `### Institutional Email Password Reset
If you have forgotten your password or are locked out:
1. Visit [accounts.google.com](https://accounts.google.com).
2. Enter your full NDMU email address (\`username@ndmu.edu.ph\`).
3. Click **"Forgot Password?"**.
4. If you linked a recovery phone or secondary email, Google will send a 6-digit verification code.
5. If recovery is not configured, submit a **Password Reset Request** ticket through this MIS Service Desk. An MIS technician will generate a temporary password and send it via SMS.`,
    },
    {
      title: 'Accessing Schoology LMS for Academic Year 2026-2027',
      slug: 'accessing-schoology-lms-guide',
      category: 'Software & Systems',
      summary: 'Log in to Schoology using Single Sign-On (SSO) with your NDMU Google credentials.',
      content: `### Schoology LMS Login Procedure
NDMU uses Google SSO for Schoology.
1. Open your browser and navigate to **schoology.ndmu.edu.ph**.
2. Click **"Log in through Google"**.
3. Choose your \`@ndmu.edu.ph\` account.
4. If your courses do not appear after 24 hours of enrollment confirmation, submit a **Schoology Account Setup** ticket to MIS.`,
    },
  ];

  for (const kb of kbArticles) {
    await pool.query(
      `INSERT INTO knowledge_base (title, slug, category, summary, content, is_published)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), content=VALUES(content)`,
      [kb.title, kb.slug, kb.category, kb.summary, kb.content]
    );
  }
  console.log('[Seed] Knowledge Base articles seeded.');

  // 6. Seed Announcements
  const announcements = [
    {
      title: 'Scheduled Maintenance: Campus Core Switch Firmware Upgrade',
      content: 'MIS will perform routine core switch firmware updates this Saturday from 10:00 PM to 2:00 AM. Intermittent wired & Wi-Fi outages may occur during this maintenance window.',
      severity: 'warning',
    },
    {
      title: 'EIS Faculty Grading Portal is Now Open for Midterm Encoding',
      content: 'Faculty members can now access the EIS Portal to encode Midterm grades. For password or access assistance, submit an Accounts ticket.',
      severity: 'info',
    },
  ];

  for (const ann of announcements) {
    await pool.query(
      'INSERT INTO announcements (title, content, severity) VALUES (?, ?, ?)',
      [ann.title, ann.content, ann.severity]
    );
  }
  console.log('[Seed] Announcements seeded.');

  // 7. Seed Sample Tickets
  const [tech1] = await pool.query('SELECT id, full_name FROM users WHERE email = ?', ['tech1@ndmu.edu.ph']);
  const [tech2] = await pool.query('SELECT id, full_name FROM users WHERE email = ?', ['tech2@ndmu.edu.ph']);
  const [faculty] = await pool.query('SELECT id, full_name, email, id_number, phone FROM users WHERE email = ?', ['faculty@ndmu.edu.ph']);

  const [catNet] = await pool.query('SELECT id FROM categories WHERE name = ?', ['Network']);
  const [catAcc] = await pool.query('SELECT id FROM categories WHERE name = ?', ['Accounts & Access']);

  const now = new Date();
  const sampleTickets = [
    {
      ticket_number: 'MIS-2026-000124',
      tracking_code: 'NDMU-TRK-100124',
      ticket_type: 'incident',
      title: 'Wi-Fi Access Point offline in CCS Building 2nd Floor',
      description: 'Students and faculty cannot connect to NDMU-Student Wi-Fi near Room 204.',
      category_id: catNet[0]?.id || 1,
      priority: 'high',
      status: 'new',
      custom_fields: JSON.stringify({ building: 'CCS Building', room_office: 'Room 204', device_type: 'Laptop', ssid_network: 'NDMU-Student', error_symptom: 'No Internet / Signal Dropping' }),
      requestor_user_id: faculty[0]?.id,
      requestor_name: 'Juan Dela Cruz',
      requestor_email: 'j.delacruz@ndmu.edu.ph',
      requestor_id_number: 'EMP-00204',
      requestor_department: 'College of Computer Studies',
      location_office: 'CCS Building Room 204',
      assigned_technician_id: null,
      sla_due_response: new Date(now.getTime() + 4 * 3600 * 1000),
      sla_due_resolution: new Date(now.getTime() + 12 * 3600 * 1000),
    },
    {
      ticket_number: 'MIS-2026-000123',
      tracking_code: 'NDMU-TRK-100123',
      ticket_type: 'service_request',
      title: 'Schoology Account Setup for 3 New CAS Instructors',
      description: 'Please create Schoology course instructor profiles for 3 newly hired General Education instructors.',
      category_id: catAcc[0]?.id || 1,
      priority: 'medium',
      status: 'assigned',
      custom_fields: JSON.stringify({ employee_id: 'EMP-00310', college_dept: 'College of Arts and Sciences', subjects_handled: 'GE 101, GE 104, Ethics', institutional_email: 'cas.sec@ndmu.edu.ph' }),
      requestor_name: 'CAS Department Secretary',
      requestor_email: 'cas.sec@ndmu.edu.ph',
      requestor_id_number: 'EMP-00301',
      requestor_department: 'College of Arts and Sciences',
      location_office: 'CAS Dean Office',
      assigned_technician_id: tech2[0]?.id,
      sla_due_response: new Date(now.getTime() + 8 * 3600 * 1000),
      sla_due_resolution: new Date(now.getTime() + 24 * 3600 * 1000),
      sla_responded_at: new Date(now.getTime() - 1 * 3600 * 1000),
    },
    {
      ticket_number: 'MIS-2026-000122',
      tracking_code: 'NDMU-TRK-100122',
      ticket_type: 'incident',
      title: 'EIS Faculty Grading Portal Error during Grade Finalization',
      description: 'Faculty gets "Database Lock Timeout" when saving section grades for CS201.',
      category_id: catAcc[0]?.id || 1,
      priority: 'high',
      status: 'in_progress',
      custom_fields: JSON.stringify({ affected_system: 'EIS Enterprise Portal', error_message: 'Database Lock Timeout 504', scope_affected: 'Entire College / Department' }),
      requestor_name: 'Jane Santos',
      requestor_email: 'jane.santos@ndmu.edu.ph',
      requestor_id_number: 'EMP-00215',
      requestor_department: 'College of Computer Studies',
      location_office: 'CCS Faculty Room',
      assigned_technician_id: tech1[0]?.id,
      sla_due_response: new Date(now.getTime() - 2 * 3600 * 1000),
      sla_due_resolution: new Date(now.getTime() + 6 * 3600 * 1000),
      sla_responded_at: new Date(now.getTime() - 3 * 3600 * 1000),
    },
  ];

  for (const t of sampleTickets) {
    const [tRes] = await pool.query(
      `INSERT INTO tickets (
        ticket_number, tracking_code, ticket_type, title, description, category_id,
        priority, status, custom_fields, requestor_user_id, requestor_name, requestor_email,
        requestor_id_number, requestor_department, location_office,
        assigned_technician_id, sla_due_response, sla_due_resolution, sla_responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      [
        t.ticket_number, t.tracking_code, t.ticket_type, t.title, t.description, t.category_id,
        t.priority, t.status, t.custom_fields, t.requestor_user_id || null, t.requestor_name, t.requestor_email,
        t.requestor_id_number, t.requestor_department, t.location_office,
        t.assigned_technician_id, t.sla_due_response, t.sla_due_resolution, t.sla_responded_at || null,
      ]
    );

    const ticketId = tRes.insertId;
    if (ticketId) {
      await pool.query(
        'INSERT INTO ticket_activity_logs (ticket_id, actor_name, action_type, comment) VALUES (?, ?, ?, ?)',
        [ticketId, t.requestor_name, 'CREATED', 'Submitted via NDMU Service Desk']
      );
      await pool.query(
        'INSERT INTO ticket_messages (ticket_id, sender_name, sender_role, message, is_internal) VALUES (?, ?, ?, ?, 0)',
        [ticketId, t.requestor_name, 'requestor', t.description]
      );
    }
  }

  console.log('[Seed] Database initialization and seed completed successfully.');
}

if (require.main === module) {
  const { initDatabase, getPool } = require('../db/index');
  initDatabase()
    .then(() => {
      console.log('Seeding finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
