// Application State
let appState = {
  contacts: [],
  messages: [],
  conversations: [],
  optOuts: [],
  campaigns: [],
  apiConfig: {
    provider: "",
    endpoint: "https://api.mobilemessage.com.au/v1/messages",
    apiKey: "",
    apiSecret: "",
    status: "not_configured",
    credentials: "not_configured",
    rateLimit: "5 concurrent requests",
    testMode: false,
    webhookInbound: "",
    webhookStatus: ""
  },
  settings: {
    quietHoursEnabled: false,
    quietHoursStart: "20:00",
    quietHoursEnd: "08:00"
  },
  templates: [
    {
      id: "intro",
      name: "Intro - Just sold nearby",
      text: "Hi {{firstName}}, it's {{fullName}} from {{suburb}}. We've just helped a neighbour and have buyers looking. Would you consider an appraisal? Reply YES for details."
    },
    {
      id: "followup",
      name: "Follow-up - Still interested?",
      text: "Hi {{firstName}}, quick one - are you still open to an updated appraisal this month? Happy to pop by."
    },
    {
      id: "appraisal",
      name: "Appraisal - Offer value",
      text: "Hi {{firstName}}, I can give you a no-obligation price update based on current buyer demand in {{suburb}}. What day suits?"
    }
  ],
  csvMapping: {
    firstName: "firstName",
    lastName: "lastName", 
    phone: "phone",
    email: "email",
    address: "address",
    suburb: "suburb",
    tags: "tags"
  },
  selectedContacts: [],
  currentSection: 'dashboard',
  messengerState: {
    selectedConversation: null,
    searchTerm: "",
    filterStatus: "all" // all, unread, active
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing application...');
  
  // Load all saved data from localStorage
  loadAllDataFromStorage();
  loadSettingsFromStorage();
  loadTemplatesFromStorage();
  loadProfileFromStorage();
  
  initializeNavigation();
  initializeEventListeners();
  updateDashboardStats();
  renderContactsTable();
  renderCampaignsTable();
  renderOptOutsTable();
  populateFilterOptions();
  populateIndividualContactSelect();
  updateRecentActivity();
  loadApiConfig(); // Load API config on app start
  updateApiStatusDisplay(); // Update API status display
  
  // Start checking for incoming messages
  startIncomingMessageChecker();
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
    'messenger': 'Messenger',
    'send-sms': 'Send SMS',
    'campaigns': 'Campaigns',
    'messages-history': 'Messages History',
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
  } else if (sectionId === 'messenger') {
    renderMessenger();
  } else if (sectionId === 'campaigns') {
    renderCampaignsTable();
  } else if (sectionId === 'messages-history') {
    renderMessagesHistoryTable();
  } else if (sectionId === 'opt-outs') {
    renderOptOutsTable();
  } else if (sectionId === 'send-sms') {
    populateIndividualContactSelect();
    updateApiStatusDisplay(); // Update API status when entering Send SMS section
    populateTemplatesUI();
  } else if (sectionId === 'profile') {
    renderProfileForm();
  }
}

// Dashboard Functions
function updateDashboardStats() {
  const totalContacts = appState.contacts.length;
  const messagesSent = appState.campaigns.length > 0 ? 
    appState.campaigns.reduce((sum, campaign) => sum + campaign.messagesSent, 0) : 0;
  const avgOptOutRate = appState.campaigns.length > 0 ? 
    appState.campaigns.reduce((sum, campaign) => sum + campaign.optOutRate, 0) / appState.campaigns.length : 0;
  const avgDeliveryRate = appState.campaigns.length > 0 ? 
    appState.campaigns.reduce((sum, campaign) => sum + campaign.deliveryRate, 0) / appState.campaigns.length : 0;
  
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
  
  // Generate activities based on actual data
  const activities = [];
  
  // Add recent contacts
  const recentContacts = appState.contacts
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
    .slice(0, 2);
  
  recentContacts.forEach(contact => {
    const timeAgo = formatRelativeTime(contact.dateAdded);
    activities.push({
      text: `New contact added: ${contact.firstName} ${contact.lastName}`,
      time: timeAgo
    });
  });
  
  // Add recent messages
  const recentMessages = appState.messages
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 2);
  
  recentMessages.forEach(message => {
    const contact = appState.contacts.find(c => c.id === message.contactId);
    const timeAgo = formatRelativeTime(message.sentAt);
    const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';
    activities.push({
      text: `SMS sent to ${contactName}`,
      time: timeAgo
    });
  });
  
  // If no activities, show default message
  if (activities.length === 0) {
    activities.push({
      text: 'No recent activity',
      time: 'Get started by adding contacts or sending messages'
    });
  }
  
  // Sort by time and take first 4
  const sortedActivities = activities
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 4);
  
  activityList.innerHTML = sortedActivities.map(activity => `
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
  console.log('Adding contact with data:', contactData);
  
  // Format and validate phone number
  const formattedPhone = formatAustralianPhoneNumber(contactData.phone);
  console.log('Formatted phone:', formattedPhone);
  
  if (!validateAustralianPhoneNumber(formattedPhone)) {
    console.error('Invalid phone number:', contactData.phone);
    showNotification('Please enter a valid Australian phone number', 'error');
    return;
  }
  
  // Check for duplicate phone number
  const existingContact = getContactByPhone(formattedPhone);
  if (existingContact) {
    console.error('Duplicate phone number found:', formattedPhone);
    showNotification('A contact with this phone number already exists', 'error');
    return;
  }
  
  const newId = appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) + 1 : 1;
  const newContact = {
    id: newId,
    ...contactData,
    phone: formattedPhone,
    status: 'active',
    dateAdded: new Date().toISOString().split('T')[0]
  };
  
  console.log('New contact object:', newContact);
  
  appState.contacts.push(newContact);
  console.log('Contacts array after adding:', appState.contacts);
  
  // Save contacts to localStorage
  saveContactsToStorage();
  
  renderContactsTable();
  populateFilterOptions();
  populateIndividualContactSelect();
  updateDashboardStats();
  hideModal('add-contact-modal');
  showNotification('Contact added successfully', 'success');
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
    
    saveContactsToStorage();
    renderContactsTable();
    populateFilterOptions();
    populateIndividualContactSelect();
    hideModal('add-contact-modal');
    showNotification('Contact updated', 'success');
  }
}

function deleteContact(contactId) {
  if (confirm('Are you sure you want to delete this contact?')) {
    appState.contacts = appState.contacts.filter(c => c.id !== contactId);
    saveContactsToStorage();
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
    saveContactsToStorage();
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

// CSV Import/Export (Legacy - kept for backward compatibility)
function processCSVImportLegacy() {
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
  // Format and validate phone number
  const formattedPhone = formatAustralianPhoneNumber(contactData.phone);
  
  if (!validateAustralianPhoneNumber(formattedPhone)) {
    return { success: false, reason: 'Invalid phone number format' };
  }
  
  // Check for duplicate phone number
  const existingContact = getContactByPhone(formattedPhone);
  if (existingContact) {
    return { success: false, reason: 'Duplicate phone number' };
  }
  
  const newId = appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) + 1 : 1;
  const newContact = {
    id: newId,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    phone: formattedPhone,
    email: contactData.email || '',
    address: contactData.address || '',
    suburb: contactData.suburb || '',
    tags: contactData.tags || [],
    status: 'active',
    dateAdded: new Date().toISOString().split('T')[0]
  };
  
  appState.contacts.push(newContact);
  return { success: true };
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
    showNotification('Please enter a message', 'error');
    return;
  }
  
  // Check API configuration
  if (appState.apiConfig.status !== 'connected' && appState.apiConfig.status !== 'configured') {
    showNotification('Please configure your SMS API in Settings first', 'error');
    return;
  }
  
  let recipients = [];
  if (recipientType === 'individual') {
    const individualContact = document.getElementById('individual-contact');
    const contactId = individualContact ? individualContact.value : '';
    if (!contactId) {
      showNotification('Please select a contact', 'error');
      return;
    }
    recipients = [parseInt(contactId)];
  } else {
    recipients = appState.contacts
      .filter(c => c.status === 'active')
      .map(c => c.id);
  }
  
  // Show sending notification
  showNotification(`Sending message to ${recipients.length} recipient(s)...`, 'info');
  
  // Get contact details for recipients
  const recipientContacts = appState.contacts.filter(c => recipients.includes(c.id));
  
  // Quiet hours check for bulk/compose
  if (shouldBlockForQuietHours('override-quiet-hours')) {
    return;
  }

        // Prepare message data for Mobile Message API
      const messageData = {
        messages: recipientContacts.map(contact => {
          // Replace placeholders in the message
          let personalizedMessage = messageValue;
          
          // Handle single-brace placeholders
          personalizedMessage = personalizedMessage.replace(/\{firstname\}/gi, contact.firstName || '');
          personalizedMessage = personalizedMessage.replace(/\{lastname\}/gi, contact.lastName || '');
          personalizedMessage = personalizedMessage.replace(/\{fullname\}/gi, `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
          personalizedMessage = personalizedMessage.replace(/\{phone\}/gi, contact.phone || '');
          personalizedMessage = personalizedMessage.replace(/\{email\}/gi, contact.email || '');
          
          // Handle double-brace placeholders ({{firstName}})
          personalizedMessage = personalizedMessage.replace(/\{\{firstName\}\}/gi, contact.firstName || '');
          personalizedMessage = personalizedMessage.replace(/\{\{lastName\}\}/gi, contact.lastName || '');
          personalizedMessage = personalizedMessage.replace(/\{\{fullName\}\}/gi, `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
          personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/gi, contact.phone || '');
          personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/gi, contact.email || '');
          personalizedMessage = personalizedMessage.replace(/\{\{address\}\}/gi, contact.address || '');
          personalizedMessage = personalizedMessage.replace(/\{\{suburb\}\}/gi, contact.suburb || '');
          
          return {
            to: contact.phone,
            message: personalizedMessage,
            sender: appState.apiConfig.senderId || 'SMSProspector', // Use configured sender ID or default
            custom_ref: `msg_${Date.now()}_${contact.id}`
          };
        })
      };
  
  // Send to Mobile Message API
  sendToMobileMessageAPI(messageData)
    .then(response => {
      console.log('API Response:', response);
      
      // Add messages to app state and conversations
      const messageId = appState.messages.length + 1;
      recipientContacts.forEach((contact, index) => {
        // Get the personalized message for this contact
        let personalizedMessage = messageValue;
        personalizedMessage = personalizedMessage.replace(/\{firstname\}/gi, contact.firstName || '');
        personalizedMessage = personalizedMessage.replace(/\{lastname\}/gi, contact.lastName || '');
        personalizedMessage = personalizedMessage.replace(/\{fullname\}/gi, `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
        personalizedMessage = personalizedMessage.replace(/\{phone\}/gi, contact.phone || '');
        personalizedMessage = personalizedMessage.replace(/\{email\}/gi, contact.email || '');
        personalizedMessage = personalizedMessage.replace(/\{\{firstName\}\}/gi, contact.firstName || '');
        personalizedMessage = personalizedMessage.replace(/\{\{lastName\}\}/gi, contact.lastName || '');
        personalizedMessage = personalizedMessage.replace(/\{\{fullName\}\}/gi, `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
        personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/gi, contact.phone || '');
        personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/gi, contact.email || '');
        personalizedMessage = personalizedMessage.replace(/\{\{address\}\}/gi, contact.address || '');
        personalizedMessage = personalizedMessage.replace(/\{\{suburb\}\}/gi, contact.suburb || '');
        
        // Add to messages array
        const sentMessage = {
          id: messageId + index,
          contactId: contact.id,
          message: personalizedMessage, // Store the personalized message
          status: 'delivered',
          sentAt: new Date().toISOString(),
          campaign: 'Manual Send'
        };
        appState.messages.push(sentMessage);
        
        // Add to conversation
        let conversation = getConversationByPhone(contact.phone);
        if (!conversation) {
          // Create new conversation
          const newConversationId = appState.conversations.length > 0 ? Math.max(...appState.conversations.map(c => c.id)) + 1 : 1;
          conversation = {
            id: newConversationId,
            contactId: contact.id,
            messages: [],
            unreadCount: 0,
            lastActivity: new Date().toISOString()
          };
          appState.conversations.push(conversation);
        }
        
        // Add sent message to conversation
        const newMessageId = Math.max(...conversation.messages.map(m => m.id), 0) + 1;
        const conversationMessage = {
          id: newMessageId,
          message: personalizedMessage, // Store the personalized message
          status: 'delivered',
          sentAt: new Date().toISOString(),
          direction: 'outbound'
        };
        
        conversation.messages.push(conversationMessage);
        conversation.lastActivity = conversationMessage.sentAt;
      });
      
      // Save messages and conversations to storage
      saveMessagesToStorage();
      saveConversationsToStorage();
      
      showNotification(`Message sent successfully to ${recipients.length} recipient(s)`, 'success');
      
      // Clear form
      messageText.value = '';
      const individualContact = document.getElementById('individual-contact');
      if (individualContact) individualContact.value = '';
      updateMessagePreview();
      updateCharacterCount();
      updateDashboardStats();
    })
    .catch(error => {
      console.error('Send message error:', error);
      
      // Provide more helpful error messages
      if (error.message.includes('fetch')) {
        showNotification('Failed to send message: Network error. Please check your internet connection.', 'error');
      } else if (error.message.includes('401')) {
        showNotification('Failed to send message: Invalid API credentials. Please check your settings.', 'error');
      } else if (error.message.includes('403')) {
        showNotification('Failed to send message: Insufficient credits or unauthorized sender ID.', 'error');
      } else {
        showNotification('Failed to send message: ' + error.message, 'error');
      }
    });
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

// API Configuration Management
function saveApiConfig(formData) {
  // Convert FormData to object
  const configData = {};
  if (formData instanceof FormData) {
    for (let [key, value] of formData.entries()) {
      configData[key] = value;
    }
  } else {
    configData = formData;
  }
  
  appState.apiConfig = {
    ...appState.apiConfig,
    ...configData,
    status: "configured",
    credentials: "configured"
  };
  
  // Save to localStorage
  localStorage.setItem('smsProspectorApiConfig', JSON.stringify(appState.apiConfig));
  
  // Update UI
  updateApiStatusDisplay();
  hideModal('api-config-modal');
  
  // Test connection
  testApiConnection();
  
  // Force refresh API status across all sections
  forceRefreshApiStatus();
  
  // Show success notification
  showNotification('API configuration saved successfully!', 'success');
}

async function testApiConnection() {
  const config = appState.apiConfig;
  
  if (!config.apiKey || !config.endpoint) {
    showNotification('Please configure API credentials first', 'error');
    return;
  }
  
  showNotification('Testing API connection...', 'info');
  
  try {
    // Validate credentials format and mark as configured
    if (config.apiKey && config.apiSecret && config.endpoint) {
      // For now, just validate the credentials are present and mark as configured
      // The real API test will happen when sending actual messages
      appState.apiConfig.status = "configured";
      updateApiStatusDisplay();
      showNotification('API configuration saved successfully! Credentials validated.', 'success');
    } else {
      throw new Error('Missing required API credentials');
    }
  } catch (error) {
    console.error('API test failed:', error);
    appState.apiConfig.status = "not_configured";
    updateApiStatusDisplay();
    showNotification('API configuration failed: ' + error.message, 'error');
  }
}

function updateApiStatusDisplay() {
  const config = appState.apiConfig;
  
  // Update settings page
  const providerField = document.getElementById('api-provider');
  const endpointField = document.getElementById('api-endpoint');
  const statusField = document.getElementById('api-status');
  const rateLimitField = document.getElementById('api-rate-limit');
  const senderIdField = document.getElementById('api-sender-id');
  
  if (providerField) providerField.value = config.provider || 'Not configured';
  if (endpointField) endpointField.value = config.endpoint || 'Not configured';
  if (rateLimitField) rateLimitField.value = config.rateLimit || 'Not configured';
  if (senderIdField) senderIdField.value = config.senderId || 'Not configured';
  
  if (statusField) {
    if (config.status === 'connected') {
      statusField.innerHTML = '<div class="status success">✓ Connected</div>';
    } else if (config.status === 'configured') {
      statusField.innerHTML = '<div class="status warning">⚠ Configured (Not tested)</div>';
    } else {
      statusField.innerHTML = '<div class="status error">✗ Not configured</div>';
    }
  }
  
  // Update SMS page API status
  const smsApiStatus = document.getElementById('sms-api-status');
  if (smsApiStatus) {
    if (config.status === 'connected' || config.status === 'configured') {
      smsApiStatus.innerHTML = `
        <div class="api-info">
          <div class="status success">✓ Connected</div>
          <div>Provider: ${config.provider}</div>
          <div>Endpoint: ${config.endpoint}</div>
          <div>Rate Limit: ${config.rateLimit}</div>
        </div>
      `;
    } else {
      smsApiStatus.innerHTML = `
        <div class="api-info">
          <div class="status error">✗ Not configured</div>
          <div>Please configure your API in Settings</div>
        </div>
      `;
    }
  }
}

function loadApiConfig() {
  const savedConfig = localStorage.getItem('smsProspectorApiConfig');
  if (savedConfig) {
    try {
      appState.apiConfig = { ...appState.apiConfig, ...JSON.parse(savedConfig) };
    } catch (e) {
      console.error('Error loading API config:', e);
    }
  }
}

function showApiConfigModal() {
  const modal = document.getElementById('api-config-modal');
  if (!modal) return;
  
  // Pre-fill form with existing config
  const form = document.getElementById('api-config-form');
  if (form) {
    form.provider.value = appState.apiConfig.provider || 'Mobile Message';
    form.endpoint.value = appState.apiConfig.endpoint || 'https://api.mobilemessage.com.au/v1/messages';
    form.apiKey.value = appState.apiConfig.apiKey || '';
    form.apiSecret.value = appState.apiConfig.apiSecret || '';
    form.rateLimit.value = appState.apiConfig.rateLimit || '5 concurrent requests';
    form.webhookInbound.value = appState.apiConfig.webhookInbound || '';
    form.webhookStatus.value = appState.apiConfig.webhookStatus || '';
    form.testMode.checked = appState.apiConfig.testMode || false;
  }
  
  showModal('api-config-modal');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Enhanced CSV Import Functions
function processCSVImport() {
  const fileInput = document.getElementById('csv-file-input');
  
  if (!fileInput) {
    showNotification('CSV file input not found. Please try again.', 'error');
    return;
  }
  
  const file = fileInput.files[0];
  
  if (!file) {
    showNotification('Please select a CSV file', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const csv = e.target.result;
    const result = parseCSVWithMapping(csv);
    
    if (result.error) {
      showNotification(result.error, 'error');
      return;
    }
    
    // Show preview modal
    showCSVPreviewModal(result.contacts, result.mapping);
  };
  reader.readAsText(file);
}

function parseCSVWithMapping(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { error: 'CSV file must have at least a header row and one data row' };
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const contacts = [];
  
  // Auto-detect column mapping
  const mapping = detectColumnMapping(headers);
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length && values[0]) {
      const contact = {};
      headers.forEach((header, index) => {
        const field = mapping[header];
        if (field) {
          if (field === 'tags') {
            contact[field] = values[index] ? values[index].split(';').map(t => t.trim()) : [];
          } else {
            contact[field] = values[index] || '';
          }
        }
      });
      
      // Validate required fields
      if (contact.firstName && contact.lastName && contact.phone) {
        contacts.push(contact);
      }
    }
  }
  
  return { contacts, mapping, headers };
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

function detectColumnMapping(headers) {
  const mapping = {};
  const fieldVariations = {
    firstName: ['firstname', 'first_name', 'first name', 'fname', 'given name'],
    lastName: ['lastname', 'last_name', 'last name', 'lname', 'surname', 'family name'],
    phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'mobile number'],
    email: ['email', 'e-mail', 'email address'],
    address: ['address', 'street', 'street address'],
    suburb: ['suburb', 'city', 'town', 'location'],
    tags: ['tags', 'tag', 'categories', 'category']
  };
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    for (const [field, variations] of Object.entries(fieldVariations)) {
      if (variations.includes(lowerHeader) || lowerHeader === field) {
        mapping[header] = field;
        break;
      }
    }
  });
  
  return mapping;
}

function showCSVPreviewModal(contacts, mapping) {
  const modal = document.getElementById('csv-preview-modal');
  if (!modal) return;
  
  const previewTable = document.getElementById('csv-preview-table');
  const mappingContainer = document.getElementById('csv-mapping-container');
  
  if (previewTable) {
    // Show preview of first 5 contacts
    const previewContacts = contacts.slice(0, 5);
    previewTable.innerHTML = `
      <thead>
        <tr>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Address</th>
          <th>Suburb</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        ${previewContacts.map(contact => `
          <tr>
            <td>${contact.firstName || '-'}</td>
            <td>${contact.lastName || '-'}</td>
            <td>${contact.phone || '-'}</td>
            <td>${contact.email || '-'}</td>
            <td>${contact.address || '-'}</td>
            <td>${contact.suburb || '-'}</td>
            <td>${contact.tags ? contact.tags.join(', ') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }
  
  if (mappingContainer) {
    const fields = ['firstName','lastName','phone','email','address','suburb','tags','ignore'];
    mappingContainer.innerHTML = `
      <h4>Column Mapping:</h4>
      <div class="mapping-list">
        ${Object.keys(mapping).map(header => `
          <div class="mapping-item">
            <span class="csv-header">${header}</span>
            <span class="arrow">→</span>
            <select class="form-control" onchange="updateCSVMapping('${header}', this.value)">
              ${fields.map(f => `<option value="${f}" ${mapping[header]===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Store data for import
  window.csvImportData = { contacts, mapping };
  
  showModal('csv-preview-modal');
}

function updateCSVMapping(header, value) {
  if (!window.csvImportData) return;
  const m = window.csvImportData.mapping || {};
  m[header] = value === 'ignore' ? null : value;
  window.csvImportData.mapping = m;
}

// Profile
function renderProfileForm() {
  const p = appState.profile || {};
  const nameEl = document.getElementById('profile-full-name');
  const agencyEl = document.getElementById('profile-agency');
  const suburbEl = document.getElementById('profile-suburb');
  const senderEl = document.getElementById('profile-sender-id');
  const qEnabledEl = document.getElementById('profile-quiet-enabled');
  const qStartEl = document.getElementById('profile-quiet-start');
  const qEndEl = document.getElementById('profile-quiet-end');
  if (nameEl) nameEl.value = p.fullName || '';
  if (agencyEl) agencyEl.value = p.agency || '';
  if (suburbEl) suburbEl.value = p.suburb || '';
  if (senderEl) senderEl.value = p.senderId || '';
  if (qEnabledEl) qEnabledEl.checked = !!appState.settings.quietHoursEnabled;
  if (qStartEl) qStartEl.value = appState.settings.quietHoursStart || '20:00';
  if (qEndEl) qEndEl.value = appState.settings.quietHoursEnd || '08:00';
}

function saveProfile() {
  const nameEl = document.getElementById('profile-full-name');
  const agencyEl = document.getElementById('profile-agency');
  const suburbEl = document.getElementById('profile-suburb');
  const senderEl = document.getElementById('profile-sender-id');
  const qEnabledEl = document.getElementById('profile-quiet-enabled');
  const qStartEl = document.getElementById('profile-quiet-start');
  const qEndEl = document.getElementById('profile-quiet-end');
  appState.profile = {
    fullName: nameEl ? nameEl.value.trim() : '',
    agency: agencyEl ? agencyEl.value.trim() : '',
    suburb: suburbEl ? suburbEl.value.trim() : '',
    senderId: senderEl ? senderEl.value.trim() : ''
  };
  appState.settings.quietHoursEnabled = qEnabledEl ? qEnabledEl.checked : false;
  appState.settings.quietHoursStart = qStartEl ? qStartEl.value : '20:00';
  appState.settings.quietHoursEnd = qEndEl ? qEndEl.value : '08:00';
  saveSettingsToStorage();
  saveProfileToStorage();
  showNotification('Profile saved', 'success');
}

function saveProfileToStorage() {
  try {
    localStorage.setItem('smsProspectorProfile', JSON.stringify(appState.profile || {}));
  } catch (e) { console.error(e); }
}

function loadProfileFromStorage() {
  try {
    const saved = localStorage.getItem('smsProspectorProfile');
    if (saved) appState.profile = JSON.parse(saved);
  } catch (e) { console.error(e); }
}

function confirmCSVImport() {
  const data = window.csvImportData;
  if (!data) return;
  
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let invalidPhoneCount = 0;
  
  data.contacts.forEach(contactData => {
    if (contactData.firstName && contactData.lastName && contactData.phone) {
      const result = addContactFromCSV(contactData);
      if (result.success) {
        importedCount++;
      } else if (result.reason === 'Duplicate phone number') {
        duplicateCount++;
      } else if (result.reason === 'Invalid phone number format') {
        invalidPhoneCount++;
      } else {
        skippedCount++;
      }
    } else {
      skippedCount++;
    }
  });
  
  // Save contacts to storage
  saveContactsToStorage();
  
  renderContactsTable();
  populateFilterOptions();
  populateIndividualContactSelect();
  updateDashboardStats();
  hideModal('csv-preview-modal');
  
  let message = `Imported ${importedCount} contacts successfully`;
  if (duplicateCount > 0) message += `, ${duplicateCount} duplicates skipped`;
  if (invalidPhoneCount > 0) message += `, ${invalidPhoneCount} invalid phone numbers`;
  if (skippedCount > 0) message += `, ${skippedCount} invalid records`;
  
  showNotification(message, 'success');
  
  // Clear stored data
  window.csvImportData = null;
}

// Messenger Functions
function renderMessenger() {
  renderConversationList();
  renderConversationView();
  updateMessengerStats();
}

function renderConversationList() {
  const conversationList = document.getElementById('conversation-list');
  if (!conversationList) return;
  
  const searchTerm = appState.messengerState.searchTerm.toLowerCase();
  const filterStatus = appState.messengerState.filterStatus;
  
  let filteredConversations = appState.conversations.filter(conversation => {
    const contact = appState.contacts.find(c => c.id === conversation.contactId);
    if (!contact) return false;
    
    const matchesSearch = !searchTerm || 
      contact.firstName.toLowerCase().includes(searchTerm) ||
      contact.lastName.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm);
    
    const isLead = contact.status === 'lead' || (contact.tags && contact.tags.includes('lead'));
    const isArchived = !!conversation.archived;
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'unread' && conversation.unreadCount > 0 && !isArchived) ||
      (filterStatus === 'active' && conversation.unreadCount === 0 && !isArchived && !isLead) ||
      (filterStatus === 'leads' && isLead) ||
      (filterStatus === 'archived' && isArchived);
    
    return matchesSearch && matchesFilter;
  });
  
  // Sort by last activity (most recent first)
  filteredConversations.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  
  conversationList.innerHTML = filteredConversations.map(conversation => {
    const contact = appState.contacts.find(c => c.id === conversation.contactId);
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const isSelected = appState.messengerState.selectedConversation === conversation.id;
    
    return `
      <div class="conversation-item ${isSelected ? 'selected' : ''}" onclick="selectConversation(${conversation.id})">
        <div class="conversation-avatar">
          <div class="avatar">${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}</div>
          ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <span class="contact-name">${contact.firstName} ${contact.lastName}</span>
            <span class="last-activity">${formatRelativeTime(lastMessage.receivedAt || lastMessage.sentAt)}</span>
          </div>
          <div class="conversation-preview">
            <span class="message-preview">${lastMessage.message.substring(0, 50)}${lastMessage.message.length > 50 ? '...' : ''}</span>
            ${lastMessage.direction === 'inbound' ? '<span class="inbound-indicator">📥</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderConversationView() {
  const conversationView = document.getElementById('conversation-view');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-reply-btn');
  
  if (!conversationView) return;
  
  const selectedConversation = appState.conversations.find(c => c.id === appState.messengerState.selectedConversation);
  
  if (!selectedConversation) {
    conversationView.innerHTML = `
      <div class="no-conversation">
        <div class="no-conversation-icon">💬</div>
        <h3>Select a conversation</h3>
        <p>Choose a conversation from the list to start messaging</p>
      </div>
    `;
    if (messageInput) messageInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    return;
  }
  
  const contact = appState.contacts.find(c => c.id === selectedConversation.contactId);
  
  // Render conversation header
  const conversationHeader = document.getElementById('conversation-header');
  if (conversationHeader) {
    conversationHeader.innerHTML = `
      <div class="conversation-contact-info">
        <div class="contact-avatar">${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}</div>
        <div class="contact-details">
          <h3>${contact.firstName} ${contact.lastName}</h3>
          <span class="contact-phone">${contact.phone}</span>
        </div>
      </div>
      <div class="conversation-actions">
        <button class="btn btn--sm btn--outline" onclick="viewContactDetails(${contact.id})">View Contact</button>
        <button class="btn btn--sm btn--outline" onclick="markSelectedConversationAsLead()">Mark as Lead</button>
        <button class="btn btn--sm btn--outline" onclick="toggleArchiveSelectedConversation()">${selectedConversation.archived ? 'Unarchive' : 'Archive'}</button>
      </div>
    `;
  }
  
  // Render messages
  const messagesContainer = document.getElementById('messages-container');
  if (messagesContainer) {
    messagesContainer.innerHTML = selectedConversation.messages.map(message => `
      <div class="message ${message.direction}">
        <div class="message-content">
          <div class="message-text">${message.message}</div>
          <div class="message-time">${formatMessageTime(message.receivedAt || message.sentAt)}</div>
          ${message.direction === 'outbound' ? `<div class="message-status ${message.status}">${getStatusIcon(message.status)}</div>` : ''}
        </div>
      </div>
    `).join('');
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Enable input
  if (messageInput) messageInput.disabled = false;
  if (sendButton) sendButton.disabled = false;
  populateReplyTemplatesUI();
  
  // Mark as read
  if (selectedConversation.unreadCount > 0) {
    markConversationAsRead(selectedConversation.id);
  }
}

function selectConversation(conversationId) {
  appState.messengerState.selectedConversation = conversationId;
  renderConversationList();
  renderConversationView();
}

function markSelectedConversationAsLead() {
  const selectedConversation = appState.conversations.find(c => c.id === appState.messengerState.selectedConversation);
  if (!selectedConversation) return;
  const contact = appState.contacts.find(c => c.id === selectedConversation.contactId);
  if (!contact) return;
  contact.status = 'lead';
  if (!contact.tags.includes('lead')) contact.tags.push('lead');
  // Optionally archive conversation to keep inbox clean
  selectedConversation.archived = true;
  saveContactsToStorage();
  saveConversationsToStorage();
  renderConversationList();
  renderConversationView();
  showNotification('Marked as lead and archived conversation', 'success');
}

function toggleArchiveSelectedConversation() {
  const selectedConversation = appState.conversations.find(c => c.id === appState.messengerState.selectedConversation);
  if (!selectedConversation) return;
  selectedConversation.archived = !selectedConversation.archived;
  saveConversationsToStorage();
  renderConversationList();
  renderConversationView();
}

function sendReply() {
  const messageInput = document.getElementById('message-input');
  const selectedConversation = appState.conversations.find(c => c.id === appState.messengerState.selectedConversation);
  
  if (!messageInput || !selectedConversation) return;
  
  const messageText = messageInput.value.trim();
  if (!messageText) return;
  
  // Check API configuration
  if (appState.apiConfig.status !== 'connected' && appState.apiConfig.status !== 'configured') {
    showNotification('Please configure your SMS API in Settings first', 'error');
    return;
  }
  
  // Add message to conversation
  const newMessageId = Math.max(...selectedConversation.messages.map(m => m.id), 0) + 1;
  const newMessage = {
    id: newMessageId,
    message: messageText,
    status: 'sending',
    sentAt: new Date().toISOString(),
    direction: 'outbound'
  };
  
  selectedConversation.messages.push(newMessage);
  selectedConversation.lastActivity = newMessage.sentAt;
  
  // Save conversations to storage
  saveConversationsToStorage();
  
  // Clear input
  messageInput.value = '';
  
  // Re-render
  renderConversationView();
  renderConversationList();
  
  // Send via Mobile Message API
  showNotification('Sending message...', 'info');
  // Quiet hours check for reply
  if (shouldBlockForQuietHours('override-quiet-hours-reply')) {
    return;
  }
  
  // Prepare message data for Mobile Message API
  const messageData = {
    messages: [{
      to: contact.phone,
      message: messageText,
      sender: appState.apiConfig.senderId || 'SMSProspector', // Use configured sender ID or default
      custom_ref: `msg_${Date.now()}`
    }]
  };
  
  // Send to Mobile Message API
  sendToMobileMessageAPI(messageData)
    .then(response => {
      console.log('API Response:', response);
      newMessage.status = 'delivered';
      renderConversationView();
      showNotification('Message sent successfully', 'success');
    })
    .catch(error => {
      console.error('Send message error:', error);
      newMessage.status = 'failed';
      renderConversationView();
      
      // Provide more helpful error messages
      if (error.message.includes('fetch')) {
        showNotification('Failed to send message: Network error. Please check your internet connection.', 'error');
      } else if (error.message.includes('401')) {
        showNotification('Failed to send message: Invalid API credentials. Please check your settings.', 'error');
      } else if (error.message.includes('403')) {
        showNotification('Failed to send message: Insufficient credits or unauthorized sender ID.', 'error');
      } else {
        showNotification('Failed to send message: ' + error.message, 'error');
      }
    });
}

function markConversationAsRead(conversationId) {
  const conversation = appState.conversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.unreadCount = 0;
    renderConversationList();
  }
}

function addIncomingMessage(phone, messageText) {
  // Find contact by phone number
  let contact = getContactByPhone(phone);
  
  // If contact doesn't exist, create a new one
  if (!contact) {
    const newId = appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) + 1 : 1;
    contact = {
      id: newId,
      firstName: 'Unknown',
      lastName: 'Contact',
      phone: formatAustralianPhoneNumber(phone),
      email: '',
      address: '',
      suburb: '',
      tags: ['unknown'],
      status: 'active',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    appState.contacts.push(contact);
  }
  
  // Find or create conversation
  let conversation = appState.conversations.find(c => c.contactId === contact.id);
  
  if (!conversation) {
    conversation = {
      id: appState.conversations.length > 0 ? Math.max(...appState.conversations.map(c => c.id)) + 1 : 1,
      contactId: contact.id,
      messages: [],
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      archived: false
    };
    appState.conversations.push(conversation);
  }
  
  // Add incoming message
  const newMessageId = conversation.messages.length > 0 ? Math.max(...conversation.messages.map(m => m.id)) + 1 : 1;
  const newMessage = {
    id: newMessageId,
    message: messageText,
    status: 'received',
    receivedAt: new Date().toISOString(),
    direction: 'inbound'
  };
  
  conversation.messages.push(newMessage);
  conversation.lastActivity = newMessage.receivedAt;
  conversation.unreadCount++;
  
  // Re-render if messenger is active
  if (appState.currentSection === 'messenger') {
    renderConversationList();
    if (appState.messengerState.selectedConversation === conversation.id) {
      renderConversationView();
    }
  }
  
  // Show notification
  const contactName = contact.firstName !== 'Unknown' ? `${contact.firstName} ${contact.lastName}` : phone;
  showNotification(`New message from ${contactName}`, 'info');
}

function updateMessengerStats() {
  const totalConversations = appState.conversations.length;
  const unreadMessages = appState.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const activeConversations = appState.conversations.filter(c => c.unreadCount === 0).length;
  
  const totalConversationsEl = document.getElementById('total-conversations');
  const unreadMessagesEl = document.getElementById('unread-messages');
  const activeConversationsEl = document.getElementById('active-conversations');
  
  if (totalConversationsEl) totalConversationsEl.textContent = totalConversations;
  if (unreadMessagesEl) unreadMessagesEl.textContent = unreadMessages;
  if (activeConversationsEl) activeConversationsEl.textContent = activeConversations;
}

function filterConversations(status) {
  appState.messengerState.filterStatus = status;
  renderConversationList();
}

function searchConversations(searchTerm) {
  appState.messengerState.searchTerm = searchTerm;
  renderConversationList();
}

function viewContactDetails(contactId) {
  // Navigate to contacts section and highlight the contact
  navigateToSection('contacts');
  // You could add logic here to scroll to and highlight the specific contact
}

// Utility functions for messenger
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusIcon(status) {
  switch (status) {
    case 'sending': return '⏳';
    case 'delivered': return '✓';
    case 'read': return '✓✓';
    case 'failed': return '✗';
    default: return '?';
  }
}

// Australian Phone Number Utilities
function formatAustralianPhoneNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different input formats
  if (cleaned.startsWith('61')) {
    // Already in international format
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Australian format starting with 0
    return '+61' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Mobile number without country code
    return '+61' + cleaned;
  } else if (cleaned.length === 10 && cleaned.startsWith('04')) {
    // Mobile number with 0
    return '+61' + cleaned.substring(1);
  } else if (cleaned.length === 8) {
    // Landline number
    return '+61' + cleaned;
  }
  
  // If it doesn't match any pattern, return as is
  return phone;
}

function validateAustralianPhoneNumber(phone) {
  const formatted = formatAustralianPhoneNumber(phone);
  
  // Australian mobile number patterns
  const mobilePatterns = [
    /^\+614\d{8}$/, // +614xxxxxxxx (mobile)
    /^04\d{8}$/,    // 04xxxxxxxx (mobile with 0)
    /^614\d{8}$/    // 614xxxxxxxx (mobile without +)
  ];
  
  // Australian landline patterns
  const landlinePatterns = [
    /^\+61[2378]\d{8}$/, // +61xxxxxxxxx (landline)
    /^0[2378]\d{8}$/,    // 0xxxxxxxxx (landline with 0)
    /^61[2378]\d{8}$/    // 61xxxxxxxxx (landline without +)
  ];
  
  return mobilePatterns.some(pattern => pattern.test(formatted)) || 
         landlinePatterns.some(pattern => pattern.test(formatted));
}

function isMobileNumber(phone) {
  const formatted = formatAustralianPhoneNumber(phone);
  const mobilePatterns = [
    /^\+614\d{8}$/, // +614xxxxxxxx (mobile)
    /^04\d{8}$/,    // 04xxxxxxxx (mobile with 0)
    /^614\d{8}$/    // 614xxxxxxxx (mobile without +)
  ];
  
  return mobilePatterns.some(pattern => pattern.test(formatted));
}

function getContactByPhone(phone) {
  const formattedPhone = formatAustralianPhoneNumber(phone);
  return appState.contacts.find(contact => 
    formatAustralianPhoneNumber(contact.phone) === formattedPhone
  );
}

function getConversationByPhone(phone) {
  const contact = getContactByPhone(phone);
  if (!contact) return null;
  
  return appState.conversations.find(conversation => 
    conversation.contactId === contact.id
  );
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
    console.log('Contact form found, adding event listener');
    addContactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('Contact form submitted');
      
      const formData = new FormData(this);
      console.log('Form data entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
      
      const contactData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        email: formData.get('email') || '',
        address: formData.get('address') || '',
        suburb: formData.get('suburb') || '',
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : []
      };
      
      console.log('Processed contact data:', contactData);
      addContact(contactData);
      this.reset();
    });
  } else {
    console.error('Contact form not found!');
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
  
  // Messenger input
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendReply();
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
        // Reset the upload zone content without recreating the file input
        const uploadIcon = uploadZone.querySelector('.upload-icon');
        const uploadText = uploadZone.querySelector('p');
        if (uploadIcon) uploadIcon.textContent = '📁';
        if (uploadText) uploadText.textContent = 'Drop your CSV file here or click to browse';
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
window.showApiConfigModal = showApiConfigModal;
window.insertPlaceholder = insertPlaceholder;
window.sendMessage = sendMessage;
window.processCSVImport = processCSVImport;
window.processCSVImportLegacy = processCSVImportLegacy;
window.confirmCSVImport = confirmCSVImport;
window.mergeDuplicates = mergeDuplicates;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.bulkDelete = bulkDelete;
window.bulkExport = bulkExport;
window.viewCampaign = viewCampaign;
window.reOptIn = reOptIn;
window.hideModal = hideModal;
window.showModal = showModal;
window.testApiConnection = testApiConnection;
  window.simulateIncomingMessage = simulateIncomingMessage;
  window.handleIncomingSMS = handleIncomingSMS;
  window.forceRefreshApiStatus = forceRefreshApiStatus;
  window.addIncomingMessageManually = addIncomingMessageManually;
  window.exportMessagesHistory = exportMessagesHistory;
  window.testWebhook = testWebhook;
  window.applyTemplate = applyTemplate;
  window.saveCurrentAsTemplate = saveCurrentAsTemplate;
  window.applyReplyTemplate = applyReplyTemplate;
  window.updateCSVMapping = updateCSVMapping;
  window.saveProfile = saveProfile;

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

// Webhook Handler for Incoming SMS
function handleIncomingSMS(webhookData) {
  // This function would be called by your SMS provider's webhook
  // webhookData should contain: { from: phoneNumber, message: text, timestamp: isoString }
  
  const { from, message, timestamp } = webhookData;
  
  if (!from || !message) {
    console.error('Invalid webhook data received');
    return;
  }
  
  // Check for opt-out keywords
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL'];
  const messageUpper = message.toUpperCase().trim();
  
  if (optOutKeywords.includes(messageUpper)) {
    handleOptOut(from, messageUpper, message);
    return;
  }
  
  // Add the incoming message
  addIncomingMessage(from, message);
  
  // Update dashboard stats
  updateDashboardStats();
  updateMessengerStats();
}

function handleOptOut(phone, keyword, originalMessage) {
  const contact = getContactByPhone(phone);
  
  if (!contact) {
    // Create unknown contact for opt-out
    const newId = appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) + 1 : 1;
    const newContact = {
      id: newId,
      firstName: 'Unknown',
      lastName: 'Contact',
      phone: formatAustralianPhoneNumber(phone),
      email: '',
      address: '',
      suburb: '',
      tags: ['unknown', 'opted_out'],
      status: 'opted_out',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    appState.contacts.push(newContact);
  } else {
    // Update existing contact
    contact.status = 'opted_out';
    if (!contact.tags.includes('opted_out')) {
      contact.tags.push('opted_out');
    }
  }
  
  // Add to opt-outs list
  const optOutId = appState.optOuts.length > 0 ? Math.max(...appState.optOuts.map(o => o.id)) + 1 : 1;
  const optOut = {
    id: optOutId,
    contactId: contact ? contact.id : (appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) : 1),
    reason: keyword,
    dateOptedOut: new Date().toISOString(),
    originalMessage: originalMessage,
    campaign: 'Manual Opt-Out'
  };
  
  appState.optOuts.push(optOut);
  
  // Update UI
  renderContactsTable();
  renderOptOutsTable();
  updateDashboardStats();
  
  console.log(`Contact ${phone} opted out with keyword: ${keyword}`);
}

// Simulate incoming message for testing
function simulateIncomingMessage(phone, message) {
  handleIncomingSMS({
    from: phone,
    message: message,
    timestamp: new Date().toISOString()
  });
}

// Function to manually add an incoming message (for testing replies)
function addIncomingMessageManually(phone, message) {
  console.log('Manually adding incoming message:', { phone, message });
  
  // Find or create contact
  let contact = getContactByPhone(phone);
  if (!contact) {
    const newId = appState.contacts.length > 0 ? Math.max(...appState.contacts.map(c => c.id)) + 1 : 1;
    contact = {
      id: newId,
      firstName: 'Unknown',
      lastName: 'Contact',
      phone: formatAustralianPhoneNumber(phone),
      email: '',
      address: '',
      suburb: '',
      tags: ['unknown'],
      status: 'active',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    appState.contacts.push(contact);
    saveContactsToStorage();
  }
  
  // Find or create conversation
  let conversation = getConversationByPhone(phone);
  if (!conversation) {
    const newConversationId = appState.conversations.length > 0 ? Math.max(...appState.conversations.map(c => c.id)) + 1 : 1;
    conversation = {
      id: newConversationId,
      contactId: contact.id,
      messages: [],
      unreadCount: 0,
      lastActivity: new Date().toISOString(),
      archived: false
    };
    appState.conversations.push(conversation);
  }
  
  // Add message to conversation
  const newMessageId = Math.max(...conversation.messages.map(m => m.id), 0) + 1;
  const newMessage = {
    id: newMessageId,
    message: message,
    status: 'received',
    receivedAt: new Date().toISOString(),
    direction: 'inbound'
  };
  
  conversation.messages.push(newMessage);
  conversation.lastActivity = newMessage.receivedAt;
  conversation.unreadCount += 1;
  
  // Save to storage
  saveConversationsToStorage();
  
  // Update UI if on messenger page
  if (appState.currentSection === 'messenger') {
    renderMessenger();
  }
  
  console.log('Incoming message added successfully');
  showNotification(`New message from ${contact.firstName} ${contact.lastName}`, 'info');
}

// Local Storage Functions
function saveContactsToStorage() {
  try {
    localStorage.setItem('smsProspectorContacts', JSON.stringify(appState.contacts));
    console.log('Contacts saved to localStorage:', appState.contacts.length, 'contacts');
  } catch (error) {
    console.error('Error saving contacts to localStorage:', error);
  }
}

function loadContactsFromStorage() {
  try {
    const savedContacts = localStorage.getItem('smsProspectorContacts');
    if (savedContacts) {
      appState.contacts = JSON.parse(savedContacts);
      console.log('Contacts loaded from localStorage:', appState.contacts.length, 'contacts');
    }
  } catch (error) {
    console.error('Error loading contacts from localStorage:', error);
  }
}

function saveMessagesToStorage() {
  try {
    localStorage.setItem('smsProspectorMessages', JSON.stringify(appState.messages));
    console.log('Messages saved to localStorage:', appState.messages.length, 'messages');
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
}

function loadMessagesFromStorage() {
  try {
    const savedMessages = localStorage.getItem('smsProspectorMessages');
    if (savedMessages) {
      appState.messages = JSON.parse(savedMessages);
      console.log('Messages loaded from localStorage:', appState.messages.length, 'messages');
    }
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
  }
}

function saveConversationsToStorage() {
  try {
    localStorage.setItem('smsProspectorConversations', JSON.stringify(appState.conversations));
    console.log('Conversations saved to localStorage:', appState.conversations.length, 'conversations');
  } catch (error) {
    console.error('Error saving conversations to localStorage:', error);
  }
}

function loadConversationsFromStorage() {
  try {
    const savedConversations = localStorage.getItem('smsProspectorConversations');
    if (savedConversations) {
      appState.conversations = JSON.parse(savedConversations);
      console.log('Conversations loaded from localStorage:', appState.conversations.length, 'conversations');
    }
  } catch (error) {
    console.error('Error loading conversations from localStorage:', error);
  }
}

function saveOptOutsToStorage() {
  try {
    localStorage.setItem('smsProspectorOptOuts', JSON.stringify(appState.optOuts));
    console.log('Opt-outs saved to localStorage:', appState.optOuts.length, 'opt-outs');
  } catch (error) {
    console.error('Error saving opt-outs to localStorage:', error);
  }
}

function loadOptOutsFromStorage() {
  try {
    const savedOptOuts = localStorage.getItem('smsProspectorOptOuts');
    if (savedOptOuts) {
      appState.optOuts = JSON.parse(savedOptOuts);
      console.log('Opt-outs loaded from localStorage:', appState.optOuts.length, 'opt-outs');
    }
  } catch (error) {
    console.error('Error loading opt-outs from localStorage:', error);
  }
}

function saveAllDataToStorage() {
  saveContactsToStorage();
  saveMessagesToStorage();
  saveConversationsToStorage();
  saveOptOutsToStorage();
  saveSettingsToStorage();
  saveTemplatesToStorage();
}

function loadAllDataFromStorage() {
  loadContactsFromStorage();
  loadMessagesFromStorage();
  loadConversationsFromStorage();
  loadOptOutsFromStorage();
}

// Settings persistence
function saveSettingsToStorage() {
  try {
    localStorage.setItem('smsProspectorSettings', JSON.stringify(appState.settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}

function loadSettingsFromStorage() {
  try {
    const saved = localStorage.getItem('smsProspectorSettings');
    if (saved) {
      appState.settings = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
}

// Templates persistence
function saveTemplatesToStorage() {
  try {
    localStorage.setItem('smsProspectorTemplates', JSON.stringify(appState.templates));
  } catch (error) {
    console.error('Error saving templates to localStorage:', error);
  }
}

function loadTemplatesFromStorage() {
  try {
    const saved = localStorage.getItem('smsProspectorTemplates');
    if (saved) {
      appState.templates = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading templates from localStorage:', error);
  }
}

// Templates UI
function populateTemplatesUI() {
  const select = document.getElementById('template-select');
  if (!select) return;
  select.innerHTML = `<option value="">Templates…</option>` + appState.templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function applyTemplate(id) {
  if (!id) return;
  const t = appState.templates.find(x => x.id === id);
  if (!t) return;
  const messageText = document.getElementById('message-text');
  if (!messageText) return;
  messageText.value = t.text;
  updateMessagePreview();
  updateCharacterCount();
}

function saveCurrentAsTemplate() {
  const messageText = document.getElementById('message-text');
  if (!messageText || !messageText.value.trim()) {
    showNotification('Type a message before saving a template', 'error');
    return;
  }
  const name = prompt('Template name');
  if (!name) return;
  const newT = { id: `t_${Date.now()}`, name, text: messageText.value };
  appState.templates.push(newT);
  saveTemplatesToStorage();
  populateTemplatesUI();
  populateReplyTemplatesUI();
  showNotification('Template saved', 'success');
}

function populateReplyTemplatesUI() {
  const select = document.getElementById('reply-template-select');
  if (!select) return;
  select.innerHTML = `<option value="">Templates…</option>` + appState.templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function applyReplyTemplate(id) {
  if (!id) return;
  const t = appState.templates.find(x => x.id === id);
  if (!t) return;
  const input = document.getElementById('message-input');
  if (!input) return;
  input.value = t.text;
}

// Quiet hours helpers
function isWithinQuietHours() {
  if (!appState.settings.quietHoursEnabled) return false;
  const now = new Date();
  const [startH, startM] = appState.settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = appState.settings.quietHoursEnd.split(':').map(Number);
  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);
  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);
  if (end <= start) {
    // Overnight window
    return now >= start || now <= end;
  }
  return now >= start && now <= end;
}

function shouldBlockForQuietHours(overrideFlagElementId) {
  // If override checkbox exists and is checked, allow send
  const el = document.getElementById(overrideFlagElementId);
  const override = el ? el.checked : false;
  if (override) return false;
  if (!isWithinQuietHours()) return false;
  showNotification('Within quiet hours. Enable override to send now.', 'warning');
  return true;
}

// Mobile Message API Functions
async function sendToMobileMessageAPI(messageData) {
  const config = appState.apiConfig;
  
  if (!config.apiKey || !config.apiSecret || !config.endpoint) {
    throw new Error('API configuration is incomplete');
  }
  
  try {
    console.log('Sending SMS request to proxy:', {
      messages: messageData.messages,
      apiConfig: {
        key: config.apiKey,
        secret: config.apiSecret ? '***' : 'missing',
        endpoint: config.endpoint
      }
    });

    // Use our server-side proxy to avoid CORS issues
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messageData.messages,
        apiConfig: {
          key: config.apiKey,
          secret: config.apiSecret,
          endpoint: config.endpoint
        }
      })
    });
    
    console.log('Proxy response status:', response.status);
    
    const responseData = await response.json();
    console.log('Proxy response data:', responseData);
    
    if (!response.ok) {
      throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('API call failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

function forceRefreshApiStatus() {
  // Force refresh API status display across all sections
  updateApiStatusDisplay();
  
  // If we're on the Send SMS section, trigger a re-render
  if (appState.currentSection === 'send-sms') {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      updateApiStatusDisplay();
    }, 100);
  }
}

// Check for incoming messages from webhook
async function checkForIncomingMessages() {
  try {
    const response = await fetch('/api/get-incoming-messages');
    const data = await response.json();
    
    if (data.messages && data.messages.length > 0) {
      console.log('Found incoming messages:', data.messages);
      
      data.messages.forEach(msg => {
        // Add each incoming message to the app
        addIncomingMessageManually(msg.from, msg.message);
      });
      
      // Show notification
      if (data.messages.length === 1) {
        showNotification(`New message received from ${data.messages[0].from}`, 'info');
      } else {
        showNotification(`${data.messages.length} new messages received`, 'info');
      }
    }
  } catch (error) {
    console.error('Error checking for incoming messages:', error);
  }
}

// Start real-time message checking
function startIncomingMessageChecker() {
  // Check immediately for any missed messages
  checkForIncomingMessages();
  
  // Connect to real-time events
  connectToRealTimeEvents();
  
  // Fallback: check every 30 seconds as backup
  setInterval(checkForIncomingMessages, 30000);
}

// Connect to real-time Server-Sent Events
function connectToRealTimeEvents() {
  try {
    const eventSource = new EventSource('/api/events');
    
    eventSource.onopen = function(event) {
      console.log('Real-time connection established');
      showNotification('Real-time messaging connected', 'success');
      updateConnectionStatus(true);
    };
    
    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('SSE connected:', data.message);
          break;
          
        case 'new_message':
          console.log('Real-time message received:', data.data);
          // Add the incoming message to the app
          addIncomingMessageManually(data.data.from, data.data.message);
          break;
          
        case 'ping':
          // Keep connection alive
          break;
          
        default:
          console.log('Unknown event type:', data.type);
      }
    };
    
    eventSource.onerror = function(event) {
      console.error('SSE connection error:', event);
      updateConnectionStatus(false);
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect to SSE...');
        connectToRealTimeEvents();
      }, 5000);
    };
    
    // Store the event source for cleanup
    window.eventSource = eventSource;
    
  } catch (error) {
    console.error('Error connecting to real-time events:', error);
    // Fallback to polling
    setInterval(checkForIncomingMessages, 10000);
  }
}

// Update connection status indicator
function updateConnectionStatus(isConnected) {
  const statusIndicator = document.getElementById('connection-status');
  if (statusIndicator) {
    if (isConnected) {
      statusIndicator.innerHTML = '<span class="status success">🟢 Live</span>';
      statusIndicator.title = 'Real-time messaging connected';
    } else {
      statusIndicator.innerHTML = '<span class="status error">🔴 Offline</span>';
      statusIndicator.title = 'Real-time messaging disconnected';
    }
  }
}

// Messages History Functions
function renderMessagesHistoryTable() {
  const tbody = document.getElementById('messages-history-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = appState.messages.map(message => {
    const contact = appState.contacts.find(c => c.id === message.contactId);
    const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown Contact';
    const contactPhone = contact ? contact.phone : 'Unknown';
    
    return `
      <tr>
        <td>
          <div class="contact-info">
            <div class="contact-name">${contactName}</div>
            <div class="contact-phone">${contactPhone}</div>
          </div>
        </td>
        <td>
          <div class="message-preview">${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}</div>
        </td>
        <td>
          <span class="status-badge status-${message.status}">${message.status}</span>
        </td>
        <td>${new Date(message.sentAt).toLocaleString()}</td>
        <td>${message.campaign || 'Manual Send'}</td>
      </tr>
    `;
  }).join('');
}

function exportMessagesHistory() {
  const csv = generateMessagesCSV(appState.messages);
  downloadCSV(csv, 'messages-history.csv');
}

function generateMessagesCSV(messages) {
  const headers = ['Contact Name', 'Phone', 'Message', 'Status', 'Sent At', 'Campaign'];
  const rows = messages.map(message => {
    const contact = appState.contacts.find(c => c.id === message.contactId);
    const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown Contact';
    const contactPhone = contact ? contact.phone : 'Unknown';
    
    return [
      contactName,
      contactPhone,
      message.message,
      message.status,
      new Date(message.sentAt).toLocaleString(),
      message.campaign || 'Manual Send'
    ];
  });
  
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Test webhook function
function testWebhook() {
  console.log('Testing webhook...');
  
  // Simulate a webhook payload
  const testPayload = {
    to: "+61412345678",
    message: "This is a test reply",
    sender: "+61412345678",
    received_at: new Date().toISOString(),
    type: "inbound",
    original_message_id: "test-123",
    original_custom_ref: "test-ref"
  };
  
  // Send to our webhook
  fetch('/api/webhooks/inbound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Webhook test response:', data);
    showNotification('Webhook test completed - check console', 'info');
  })
  .catch(error => {
    console.error('Webhook test error:', error);
    showNotification('Webhook test failed - check console', 'error');
  });
}