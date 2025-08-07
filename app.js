// Application State
let appState = {
  contacts: [
    {id: 1, firstName: "John", lastName: "Smith", phone: "+61412345678", email: "john.smith@email.com", address: "123 Collins St", suburb: "Melbourne", status: "active", tags: ["customer", "vip"], dateAdded: "2025-07-15"},
    {id: 2, firstName: "Sarah", lastName: "Johnson", phone: "+61423456789", email: "sarah.j@email.com", address: "456 Bourke St", suburb: "Melbourne", status: "active", tags: ["prospect"], dateAdded: "2025-07-20"},
    {id: 3, firstName: "Michael", lastName: "Brown", phone: "+61434567890", email: "m.brown@email.com", address: "789 Chapel St", suburb: "South Yarra", status: "opted_out", tags: ["customer"], dateAdded: "2025-07-10"},
    {id: 4, firstName: "Emma", lastName: "Wilson", phone: "+61445678901", email: "emma.wilson@email.com", address: "321 Smith St", suburb: "Collingwood", status: "active", tags: ["customer", "local"], dateAdded: "2025-07-25"},
    {id: 5, firstName: "David", lastName: "Jones", phone: "+61456789012", email: "david.jones@email.com", address: "654 High St", suburb: "Armadale", status: "active", tags: ["prospect", "referral"], dateAdded: "2025-07-18"},
    {id: 6, firstName: "Lisa", lastName: "Garcia", phone: "+61467890123", email: "lisa.garcia@email.com", address: "987 Brunswick St", suburb: "Fitzroy", status: "active", tags: ["customer"], dateAdded: "2025-07-22"},
    {id: 7, firstName: "James", lastName: "Miller", phone: "+61478901234", email: "james.miller@email.com", address: "147 Swan St", suburb: "Richmond", status: "opted_out", tags: ["prospect"], dateAdded: "2025-07-12"}
  ],
  messages: [
    {id: 1, contactId: 1, message: "Hi John, your appointment is confirmed for tomorrow at 2pm.", status: "delivered", sentAt: "2025-08-05T10:30:00", campaign: "Appointment Reminders"},
    {id: 2, contactId: 2, message: "Sarah, thanks for your interest! Here's the information you requested.", status: "delivered", sentAt: "2025-08-05T14:15:00", campaign: "Follow-up"},
    {id: 3, contactId: 4, message: "Emma, special offer just for you - 20% off this weekend!", status: "delivered", sentAt: "2025-08-05T16:45:00", campaign: "Promotions"}
  ],
  optOuts: [
    {id: 1, contactId: 3, reason: "STOP", dateOptedOut: "2025-08-03T09:20:00", originalMessage: "Weekly newsletter update", campaign: "Newsletter"},
    {id: 2, contactId: 7, reason: "UNSUBSCRIBE", dateOptedOut: "2025-08-01T15:30:00", originalMessage: "Flash sale notification", campaign: "Sales"}
  ],
  campaigns: [
    {id: 1, name: "Appointment Reminders", messagesSent: 45, deliveryRate: 98.5, optOutRate: 0.5, createdAt: "2025-07-30"},
    {id: 2, name: "Weekly Newsletter", messagesSent: 120, deliveryRate: 97.2, optOutRate: 2.1, createdAt: "2025-07-28"},
    {id: 3, name: "Promotions", messagesSent: 80, deliveryRate: 96.8, optOutRate: 1.5, createdAt: "2025-08-02"}
  ],
  apiConfig: {
    provider: "Mobile Message Australia",
    endpoint: "https://api.mobilemessage.com.au/v1/messages",
    status: "connected",
    credentials: "configured",
    rateLimit: "100 messages/minute"
  },
  selectedContacts: [],
  currentSection: 'dashboard'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing application...');
  initializeNavigation();
  initializeEventListeners();
  updateDashboardStats();
  renderContactsTable();
  renderCampaignsTable();
  renderOptOutsTable();
  populateFilterOptions();
  populateIndividualContactSelect();
  updateRecentActivity();
});

// Navigation
function initializeNavigation() {
  console.log('Initializing navigation...');
  const navLinks = document.querySelectorAll('.nav-link');
  console.log('Found navigation links:', navLinks.length);
  
  navLinks.forEach((link, index) => {
    console.log(`Setting up nav link ${index}:`, link.dataset.section);
    
    // Remove any existing event listeners
    link.onclick = null;
    
    // Add click event listener
    link.addEventListener('click', function(e) {
      console.log('Nav link clicked:', this.dataset.section);
      e.preventDefault();
      e.stopPropagation();
      
      const sectionId = this.dataset.section;
      if (sectionId) {
        navigateToSection(sectionId);
      }
      
      return false;
    });
  });
}

function navigateToSection(sectionId) {
  console.log('Navigating to section:', sectionId);
  
  // Update navigation active states
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.section === sectionId) {
      link.classList.add('active');
      console.log('Set active nav link for:', sectionId);
    }
  });
  
  // Update sections visibility
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.remove('active');
    if (section.id === sectionId) {
      section.classList.add('active');
      console.log('Set active section:', sectionId);
    }
  });
  
  // Update page title
  const pageTitle = document.getElementById('page-title');
  const titles = {
    'dashboard': 'Dashboard',
    'contacts': 'Contacts',
    'send-sms': 'Send SMS',
    'campaigns': 'Campaigns',
    'opt-outs': 'Opt-Outs',
    'settings': 'Settings'
  };
  
  if (pageTitle) {
    pageTitle.textContent = titles[sectionId] || 'SMS Manager';
  }
  
  appState.currentSection = sectionId;
  
  // Refresh data when navigating to specific sections
  if (sectionId === 'contacts') {
    renderContactsTable();
    populateFilterOptions();
  } else if (sectionId === 'campaigns') {
    renderCampaignsTable();
  } else if (sectionId === 'opt-outs') {
    renderOptOutsTable();
  } else if (sectionId === 'send-sms') {
    populateIndividualContactSelect();
  }
}

// Dashboard Functions
function updateDashboardStats() {
  const totalContacts = appState.contacts.length;
  const messagesSent = appState.campaigns.reduce((sum, campaign) => sum + campaign.messagesSent, 0);
  const avgOptOutRate = appState.campaigns.reduce((sum, campaign) => sum + campaign.optOutRate, 0) / appState.campaigns.length;
  const avgDeliveryRate = appState.campaigns.reduce((sum, campaign) => sum + campaign.deliveryRate, 0) / appState.campaigns.length;
  
  const totalContactsEl = document.getElementById('total-contacts');
  const messagesSentEl = document.getElementById('messages-sent');
  const optOutRateEl = document.getElementById('opt-out-rate');
  const deliveryRateEl = document.getElementById('delivery-rate');
  
  if (totalContactsEl) totalContactsEl.textContent = totalContacts;
  if (messagesSentEl) messagesSentEl.textContent = messagesSent.toLocaleString();
  if (optOutRateEl) optOutRateEl.textContent = avgOptOutRate.toFixed(1) + '%';
  if (deliveryRateEl) deliveryRateEl.textContent = avgDeliveryRate.toFixed(1) + '%';
}

function updateRecentActivity() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;
  
  const activities = [
    {text: 'New contact added: Emma Wilson', time: '2 hours ago'},
    {text: 'SMS campaign "Promotions" sent to 80 contacts', time: '4 hours ago'},
    {text: 'CSV import completed: 15 contacts added', time: '1 day ago'},
    {text: 'Opt-out processed for Michael Brown', time: '2 days ago'}
  ];
  
  activityList.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <span>${activity.text}</span>
      <span class="activity-time">${activity.time}</span>
    </div>
  `).join('');
}

// Contact Management
function renderContactsTable() {
  const tbody = document.getElementById('contacts-table-body');
  if (!tbody) return;
  
  const contactSearch = document.getElementById('contact-search');
  const statusFilter = document.getElementById('status-filter');
  const suburbFilter = document.getElementById('suburb-filter');
  const tagFilter = document.getElementById('tag-filter');
  
  const searchTerm = contactSearch ? contactSearch.value.toLowerCase() : '';
  const statusFilterValue = statusFilter ? statusFilter.value : '';
  const suburbFilterValue = suburbFilter ? suburbFilter.value : '';
  const tagFilterValue = tagFilter ? tagFilter.value : '';
  
  let filteredContacts = appState.contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.firstName.toLowerCase().includes(searchTerm) ||
      contact.lastName.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      (contact.email && contact.email.toLowerCase().includes(searchTerm));
    
    const matchesStatus = !statusFilterValue || contact.status === statusFilterValue;
    const matchesSuburb = !suburbFilterValue || contact.suburb === suburbFilterValue;
    const matchesTag = !tagFilterValue || contact.tags.includes(tagFilterValue);
    
    return matchesSearch && matchesStatus && matchesSuburb && matchesTag;
  });
  
  tbody.innerHTML = filteredContacts.map(contact => `
    <tr>
      <td><input type="checkbox" data-contact-id="${contact.id}" class="contact-checkbox"></td>
      <td>${contact.firstName} ${contact.lastName}</td>
      <td>${contact.phone}</td>
      <td>${contact.email || '-'}</td>
      <td>${contact.address || '-'}</td>
      <td>${contact.suburb || '-'}</td>
      <td><span class="status-badge ${contact.status}">${contact.status.replace('_', ' ')}</span></td>
      <td>
        <div class="tag-list">
          ${contact.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="editContact(${contact.id})">Edit</button>
          <button class="action-btn delete" onclick="deleteContact(${contact.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Update contact checkboxes event listeners
  document.querySelectorAll('.contact-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedContacts);
  });
}

function populateFilterOptions() {
  const suburbs = [...new Set(appState.contacts.map(c => c.suburb).filter(Boolean))];
  const tags = [...new Set(appState.contacts.flatMap(c => c.tags))];
  
  const suburbFilter = document.getElementById('suburb-filter');
  const tagFilter = document.getElementById('tag-filter');
  
  if (suburbFilter) {
    suburbFilter.innerHTML = '<option value="">All Suburbs</option>' +
      suburbs.map(suburb => `<option value="${suburb}">${suburb}</option>`).join('');
  }
  
  if (tagFilter) {
    tagFilter.innerHTML = '<option value="">All Tags</option>' +
      tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
  }
}

function updateSelectedContacts() {
  const checkboxes = document.querySelectorAll('.contact-checkbox:checked');
  appState.selectedContacts = Array.from(checkboxes).map(cb => parseInt(cb.dataset.contactId));
  
  const bulkActions = document.getElementById('bulk-actions');
  const selectedCount = document.getElementById('selected-count');
  
  if (bulkActions && selectedCount) {
    if (appState.selectedContacts.length > 0) {
      bulkActions.style.display = 'flex';
      selectedCount.textContent = `${appState.selectedContacts.length} selected`;
    } else {
      bulkActions.style.display = 'none';
    }
  }
}

function addContact(contactData) {
  const newId = Math.max(...appState.contacts.map(c => c.id)) + 1;
  const newContact = {
    id: newId,
    ...contactData,
    status: 'active',
    dateAdded: new Date().toISOString().split('T')[0]
  };
  
  appState.contacts.push(newContact);
  renderContactsTable();
  populateFilterOptions();
  populateIndividualContactSelect();
  updateDashboardStats();
  hideModal('add-contact-modal');
}

function editContact(contactId) {
  const contact = appState.contacts.find(c => c.id === contactId);
  if (contact) {
    // Pre-fill the form with existing data
    const form = document.getElementById('add-contact-form');
    if (form) {
      form.firstName.value = contact.firstName;
      form.lastName.value = contact.lastName;
      form.phone.value = contact.phone;
      form.email.value = contact.email || '';
      form.address.value = contact.address || '';
      form.suburb.value = contact.suburb || '';
      form.tags.value = contact.tags.join(', ');
      
      // Change form behavior to edit mode
      form.onsubmit = function(e) {
        e.preventDefault();
        updateContact(contactId, new FormData(form));
      };
      
      showModal('add-contact-modal');
      const modalTitle = document.querySelector('#add-contact-modal h3');
      if (modalTitle) modalTitle.textContent = 'Edit Contact';
    }
  }
}

function updateContact(contactId, formData) {
  const contactIndex = appState.contacts.findIndex(c => c.id === contactId);
  if (contactIndex !== -1) {
    appState.contacts[contactIndex] = {
      ...appState.contacts[contactIndex],
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      email: formData.get('email') || '',
      address: formData.get('address') || '',
      suburb: formData.get('suburb') || '',
      tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : []
    };
    
    renderContactsTable();
    populateFilterOptions();
    populateIndividualContactSelect();
    hideModal('add-contact-modal');
  }
}

function deleteContact(contactId) {
  if (confirm('Are you sure you want to delete this contact?')) {
    appState.contacts = appState.contacts.filter(c => c.id !== contactId);
    renderContactsTable();
    populateFilterOptions();
    populateIndividualContactSelect();
    updateDashboardStats();
  }
}

function bulkDelete() {
  if (confirm(`Are you sure you want to delete ${appState.selectedContacts.length} contacts?`)) {
    appState.contacts = appState.contacts.filter(c => !appState.selectedContacts.includes(c.id));
    appState.selectedContacts = [];
    renderContactsTable();
    populateFilterOptions();
    populateIndividualContactSelect();
    updateDashboardStats();
  }
}

function bulkExport() {
  const selectedContactsData = appState.contacts.filter(c => appState.selectedContacts.includes(c.id));
  const csv = generateCSV(selectedContactsData);
  downloadCSV(csv, 'selected_contacts.csv');
}

// CSV Import/Export
function processCSVImport() {
  const fileInput = document.getElementById('csv-file-input');
  const file = fileInput ? fileInput.files[0] : null;
  
  if (!file) {
    alert('Please select a CSV file');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const csv = e.target.result;
    const contacts = parseCSV(csv);
    
    let importedCount = 0;
    contacts.forEach(contactData => {
      if (contactData.firstName && contactData.lastName && contactData.phone) {
        addContactFromCSV(contactData);
        importedCount++;
      }
    });
    
    renderContactsTable();
    populateFilterOptions();
    populateIndividualContactSelect();
    updateDashboardStats();
    hideModal('import-modal');
    alert(`Imported ${importedCount} contacts successfully`);
  };
  reader.readAsText(file);
}

function parseCSV(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const contacts = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length && values[0]) {
      const contact = {};
      headers.forEach((header, index) => {
        if (header === 'tags') {
          contact[header] = values[index] ? values[index].split(';').map(t => t.trim()) : [];
        } else {
          contact[header] = values[index] || '';
        }
      });
      contacts.push(contact);
    }
  }
  
  return contacts;
}

function addContactFromCSV(contactData) {
  const newId = Math.max(...appState.contacts.map(c => c.id)) + 1;
  const newContact = {
    id: newId,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    phone: contactData.phone,
    email: contactData.email || '',
    address: contactData.address || '',
    suburb: contactData.suburb || '',
    tags: contactData.tags || [],
    status: 'active',
    dateAdded: new Date().toISOString().split('T')[0]
  };
  
  appState.contacts.push(newContact);
}

function generateCSV(contacts) {
  const headers = ['firstName', 'lastName', 'phone', 'email', 'address', 'suburb', 'tags'];
  const csvContent = [
    headers.join(','),
    ...contacts.map(contact => 
      headers.map(header => 
        header === 'tags' ? contact[header].join(';') : contact[header] || ''
      ).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Duplicate Detection
function showDuplicatesModal() {
  const duplicates = findDuplicateContacts();
  const duplicatesList = document.getElementById('duplicates-list');
  
  if (!duplicatesList) return;
  
  if (duplicates.length === 0) {
    duplicatesList.innerHTML = '<p>No duplicate contacts found!</p>';
  } else {
    duplicatesList.innerHTML = duplicates.map((group, index) => `
      <div class="duplicate-group">
        <h4>Duplicate Group ${index + 1}</h4>
        <div class="duplicate-contacts">
          ${group.map(contact => `
            <div class="duplicate-contact">
              <label>
                <input type="checkbox" name="merge-${index}" value="${contact.id}">
                <strong>${contact.firstName} ${contact.lastName}</strong><br>
                ${contact.phone}<br>
                ${contact.email || 'No email'}
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
  
  showModal('duplicates-modal');
}

function findDuplicateContacts() {
  const duplicateGroups = [];
  const processed = new Set();
  
  appState.contacts.forEach((contact, index) => {
    if (processed.has(contact.id)) return;
    
    const duplicates = appState.contacts.filter((other, otherIndex) => 
      otherIndex !== index && 
      !processed.has(other.id) &&
      (contact.phone === other.phone || 
       (contact.email && contact.email === other.email) ||
       (contact.firstName === other.firstName && contact.lastName === other.lastName))
    );
    
    if (duplicates.length > 0) {
      const group = [contact, ...duplicates];
      group.forEach(c => processed.add(c.id));
      duplicateGroups.push(group);
    }
  });
  
  return duplicateGroups;
}

function mergeDuplicates() {
  const checkboxes = document.querySelectorAll('#duplicates-modal input[type="checkbox"]:checked');
  const contactsToRemove = [];
  
  checkboxes.forEach(checkbox => {
    const contactId = parseInt(checkbox.value);
    if (!contactsToRemove.includes(contactId)) {
      contactsToRemove.push(contactId);
    }
  });
  
  if (contactsToRemove.length > 0) {
    appState.contacts = appState.contacts.filter(c => !contactsToRemove.includes(c.id));
    renderContactsTable();
    hideModal('duplicates-modal');
    alert(`Removed ${contactsToRemove.length} duplicate contacts`);
  }
}

// SMS Functionality
function populateIndividualContactSelect() {
  const select = document.getElementById('individual-contact');
  if (!select) return;
  
  const activeContacts = appState.contacts.filter(c => c.status === 'active');
  
  select.innerHTML = '<option value="">Select a contact...</option>' +
    activeContacts.map(contact => 
      `<option value="${contact.id}">${contact.firstName} ${contact.lastName} (${contact.phone})</option>`
    ).join('');
}

function insertPlaceholder(placeholder) {
  const textarea = document.getElementById('message-text');
  if (!textarea) return;
  
  const cursorPos = textarea.selectionStart;
  const textBefore = textarea.value.substring(0, cursorPos);
  const textAfter = textarea.value.substring(textarea.selectionEnd);
  
  textarea.value = textBefore + placeholder + textAfter;
  textarea.focus();
  textarea.setSelectionRange(cursorPos + placeholder.length, cursorPos + placeholder.length);
  
  updateMessagePreview();
  updateCharacterCount();
}

function updateMessagePreview() {
  const messageText = document.getElementById('message-text');
  const preview = document.getElementById('message-preview');
  const selectedContactId = document.getElementById('individual-contact');
  
  if (!messageText || !preview || !selectedContactId) return;
  
  const messageValue = messageText.value;
  const contactId = selectedContactId.value;
  
  if (contactId) {
    const contact = appState.contacts.find(c => c.id === parseInt(contactId));
    if (contact) {
      let previewText = messageValue
        .replace(/\{\{firstName\}\}/g, contact.firstName)
        .replace(/\{\{lastName\}\}/g, contact.lastName)
        .replace(/\{\{phone\}\}/g, contact.phone)
        .replace(/\{\{email\}\}/g, contact.email || '[No email]')
        .replace(/\{\{address\}\}/g, contact.address || '[No address]')
        .replace(/\{\{suburb\}\}/g, contact.suburb || '[No suburb]');
      
      preview.textContent = previewText || 'Your message will appear here with placeholders filled...';
    }
  } else {
    preview.textContent = messageValue || 'Your message will appear here with placeholders filled...';
  }
}

function updateCharacterCount() {
  const messageText = document.getElementById('message-text');
  const count = document.getElementById('character-count');
  
  if (!messageText || !count) return;
  
  const length = messageText.value.length;
  count.textContent = `${length}/160 characters`;
  
  if (length > 160) {
    count.style.color = 'var(--color-error)';
  } else {
    count.style.color = 'var(--color-text-secondary)';
  }
}

function sendMessage() {
  const messageText = document.getElementById('message-text');
  const recipientTypeRadio = document.querySelector('input[name="recipient-type"]:checked');
  
  if (!messageText || !recipientTypeRadio) return;
  
  const messageValue = messageText.value;
  const recipientType = recipientTypeRadio.value;
  
  if (!messageValue.trim()) {
    alert('Please enter a message');
    return;
  }
  
  let recipients = [];
  if (recipientType === 'individual') {
    const individualContact = document.getElementById('individual-contact');
    const contactId = individualContact ? individualContact.value : '';
    if (!contactId) {
      alert('Please select a contact');
      return;
    }
    recipients = [parseInt(contactId)];
  } else {
    recipients = appState.contacts
      .filter(c => c.status === 'active')
      .map(c => c.id);
  }
  
  // Simulate API call
  const messageId = appState.messages.length + 1;
  recipients.forEach(contactId => {
    appState.messages.push({
      id: messageId + Math.random(),
      contactId: contactId,
      message: messageValue,
      status: 'delivered',
      sentAt: new Date().toISOString(),
      campaign: 'Manual Send'
    });
  });
  
  alert(`Message sent to ${recipients.length} recipient(s)`);
  
  // Clear form
  messageText.value = '';
  const individualContact = document.getElementById('individual-contact');
  if (individualContact) individualContact.value = '';
  updateMessagePreview();
  updateCharacterCount();
  updateDashboardStats();
}

// Campaign Management
function renderCampaignsTable() {
  const tbody = document.getElementById('campaigns-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = appState.campaigns.map(campaign => `
    <tr>
      <td>${campaign.name}</td>
      <td>${campaign.messagesSent}</td>
      <td>${campaign.deliveryRate}%</td>
      <td>${campaign.optOutRate}%</td>
      <td>${new Date(campaign.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="viewCampaign(${campaign.id})">View</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function viewCampaign(campaignId) {
  const campaign = appState.campaigns.find(c => c.id === campaignId);
  if (campaign) {
    alert(`Campaign: ${campaign.name}\nMessages Sent: ${campaign.messagesSent}\nDelivery Rate: ${campaign.deliveryRate}%\nOpt-Out Rate: ${campaign.optOutRate}%`);
  }
}

// Opt-Out Management
function renderOptOutsTable() {
  const tbody = document.getElementById('opt-outs-table-body');
  if (!tbody) return;
  
  const optOutsWithContacts = appState.optOuts.map(optOut => {
    const contact = appState.contacts.find(c => c.id === optOut.contactId);
    return { ...optOut, contact };
  });
  
  tbody.innerHTML = optOutsWithContacts.map(optOut => `
    <tr>
      <td>${optOut.contact ? `${optOut.contact.firstName} ${optOut.contact.lastName}` : 'Unknown'}</td>
      <td>${optOut.contact ? optOut.contact.phone : 'Unknown'}</td>
      <td><span class="keyword-badge">${optOut.reason}</span></td>
      <td>${new Date(optOut.dateOptedOut).toLocaleDateString()}</td>
      <td>${optOut.originalMessage}</td>
      <td>${optOut.campaign}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="reOptIn(${optOut.contactId})">Re-opt In</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function reOptIn(contactId) {
  if (confirm('Are you sure you want to re-opt this contact back in?')) {
    const contactIndex = appState.contacts.findIndex(c => c.id === contactId);
    if (contactIndex !== -1) {
      appState.contacts[contactIndex].status = 'active';
      appState.optOuts = appState.optOuts.filter(opt => opt.contactId !== contactId);
      renderContactsTable();
      renderOptOutsTable();
      updateDashboardStats();
      alert('Contact has been re-opted in successfully');
    }
  }
}

// Event Listeners
function initializeEventListeners() {
  console.log('Initializing event listeners...');
  
  // Contact search and filters - with proper event handling
  const contactSearch = document.getElementById('contact-search');
  const statusFilter = document.getElementById('status-filter');
  const suburbFilter = document.getElementById('suburb-filter');
  const tagFilter = document.getElementById('tag-filter');
  
  if (contactSearch) {
    // Prevent default form behavior and navigation
    contactSearch.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    contactSearch.addEventListener('focus', function(e) {
      e.stopPropagation();
    });
    
    contactSearch.addEventListener('input', function(e) {
      e.stopPropagation();
      renderContactsTable();
    });
    
    contactSearch.addEventListener('keyup', function(e) {
      e.stopPropagation();
      renderContactsTable();
    });
  }
  
  [statusFilter, suburbFilter, tagFilter].forEach(element => {
    if (element) {
      element.addEventListener('change', function(e) {
        e.stopPropagation();
        renderContactsTable();
      });
    }
  });
  
  // Select all checkbox
  const selectAll = document.getElementById('select-all');
  if (selectAll) {
    selectAll.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('.contact-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
      updateSelectedContacts();
    });
  }
  
  // Add contact form
  const addContactForm = document.getElementById('add-contact-form');
  if (addContactForm) {
    addContactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const contactData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        email: formData.get('email') || '',
        address: formData.get('address') || '',
        suburb: formData.get('suburb') || '',
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : []
      };
      addContact(contactData);
      this.reset();
    });
  }
  
  // SMS composition
  const messageText = document.getElementById('message-text');
  const individualContact = document.getElementById('individual-contact');
  const recipientTypeRadios = document.querySelectorAll('input[name="recipient-type"]');
  const sendTimingRadios = document.querySelectorAll('input[name="send-timing"]');
  const scheduleTime = document.getElementById('schedule-time');
  
  if (messageText) {
    messageText.addEventListener('input', function() {
      updateMessagePreview();
      updateCharacterCount();
    });
  }
  
  if (individualContact) {
    individualContact.addEventListener('change', updateMessagePreview);
  }
  
  recipientTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const individualSelection = document.getElementById('individual-selection');
      const groupSelection = document.getElementById('group-selection');
      
      if (this.value === 'individual') {
        if (individualSelection) individualSelection.style.display = 'block';
        if (groupSelection) groupSelection.style.display = 'none';
      } else {
        if (individualSelection) individualSelection.style.display = 'none';
        if (groupSelection) groupSelection.style.display = 'block';
      }
    });
  });
  
  sendTimingRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'schedule') {
        if (scheduleTime) scheduleTime.style.display = 'block';
      } else {
        if (scheduleTime) scheduleTime.style.display = 'none';
      }
    });
  });
  
  // CSV file input
  const csvFileInput = document.getElementById('csv-file-input');
  const uploadZone = document.getElementById('upload-zone');
  
  if (csvFileInput && uploadZone) {
    csvFileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        uploadZone.innerHTML = `
          <div class="upload-icon">✓</div>
          <p>File selected: ${this.files[0].name}</p>
        `;
      }
    });
    
    // Drag and drop functionality
    uploadZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function() {
      this.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        csvFileInput.files = files;
        csvFileInput.dispatchEvent(new Event('change'));
      }
    });
  }
}

// Modal Management
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Reset form if it's the add contact modal
    if (modalId === 'add-contact-modal') {
      const form = document.getElementById('add-contact-form');
      if (form) {
        form.reset();
        form.onsubmit = function(e) {
          e.preventDefault();
          const formData = new FormData(this);
          const contactData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone'),
            email: formData.get('email') || '',
            address: formData.get('address') || '',
            suburb: formData.get('suburb') || '',
            tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : []
          };
          addContact(contactData);
          this.reset();
        };
        const modalTitle = document.querySelector('#add-contact-modal h3');
        if (modalTitle) modalTitle.textContent = 'Add New Contact';
      }
    }
    
    // Reset CSV upload modal
    if (modalId === 'import-modal') {
      const uploadZone = document.getElementById('upload-zone');
      const csvFileInput = document.getElementById('csv-file-input');
      if (uploadZone) {
        uploadZone.innerHTML = `
          <div class="upload-icon">📁</div>
          <p>Drop your CSV file here or click to browse</p>
          <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
          <button type="button" class="btn btn--outline" onclick="document.getElementById('csv-file-input').click()">Choose File</button>
        `;
      }
      if (csvFileInput) {
        csvFileInput.value = '';
      }
    }
  }
}

function showAddContactModal() {
  showModal('add-contact-modal');
}

function showImportModal() {
  showModal('import-modal');
}

// Global functions (called from HTML)
window.navigateToSection = navigateToSection;
window.showAddContactModal = showAddContactModal;
window.showImportModal = showImportModal;
window.showDuplicatesModal = showDuplicatesModal;
window.insertPlaceholder = insertPlaceholder;
window.sendMessage = sendMessage;
window.processCSVImport = processCSVImport;
window.mergeDuplicates = mergeDuplicates;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.bulkDelete = bulkDelete;
window.bulkExport = bulkExport;
window.viewCampaign = viewCampaign;
window.reOptIn = reOptIn;
window.hideModal = hideModal;
window.showModal = showModal;

// Close modals when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    const modalId = e.target.id;
    hideModal(modalId);
  }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
    visibleModals.forEach(modal => {
      hideModal(modal.id);
    });
  }
});

// Prevent default navigation behavior for anchor links
document.addEventListener('click', function(e) {
  if (e.target.tagName === 'A' && e.target.getAttribute('href') && e.target.getAttribute('href').startsWith('#')) {
    e.preventDefault();
  }
});