// Schedule storage
const schedule = {};

function to12Hour(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function to24Hour(time12) {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Add class
document.getElementById("add-class").addEventListener("click", () => {
  const day = document.getElementById("day").value;
  const startTime = document.getElementById("start-time").value;
  const endTime = document.getElementById("end-time").value;
  const bufferTime = parseInt(document.getElementById("buffer-time").value);

  if (!day || !startTime || !endTime || isNaN(bufferTime)) {
    alert("Please fill out all fields!");
    return;
  }

  if (!schedule[day]) schedule[day] = [];
  schedule[day].push({ startTime, endTime, bufferTime });

  updateClassList();
  document.getElementById("class-form").reset();
});

// Update class list
function updateClassList() {
  const classList = document.getElementById("class-list");
  classList.innerHTML = "";

  for (const day in schedule) {
    const dayDiv = document.createElement("div");
    dayDiv.innerHTML = `<strong>${day}</strong>`;
    const dayClasses = schedule[day]
      .map(
        (cls, index) => `
      <div>
        ${to12Hour(cls.startTime)} - ${to12Hour(cls.endTime)} (Buffer: ${cls.bufferTime} hr)
        <button onclick="editClass('${day}', ${index})">Edit</button>
        <button onclick="deleteClass('${day}', ${index})">Delete</button>
      </div>
    `
      )
      .join("");
    dayDiv.innerHTML += dayClasses;
    classList.appendChild(dayDiv);
  }
}

// Edit class
function editClass(day, index) {
  const cls = schedule[day][index];
  document.getElementById("day").value = day;
  document.getElementById("start-time").value = cls.startTime;
  document.getElementById("end-time").value = cls.endTime;
  document.getElementById("buffer-time").value = cls.bufferTime;
  schedule[day].splice(index, 1);
  updateClassList();
}

// Delete class
function deleteClass(day, index) {
  schedule[day].splice(index, 1);
  if (!schedule[day].length) delete schedule[day];
  updateClassList();
}

// Modify the generate report section
document.getElementById("generate-report").addEventListener("click", () => {
  const availabilityOutput = document.getElementById("availability");
  availabilityOutput.innerHTML = "";

  const fullDayHours = { start: "08:00", end: "22:00" }; // Keep internal calculations in 24h

  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    const dayAvailability = [];
    const unavailableTimes = schedule[day] || [];

    if (unavailableTimes.length === 0) {
      dayAvailability.push(`${to12Hour(fullDayHours.start)} - ${to12Hour(fullDayHours.end)}`);
    } else {
      const combinedUnavailableTimes = unavailableTimes.map(({ startTime, endTime, bufferTime }) => ({
        start: adjustTime(startTime, -bufferTime),
        end: adjustTime(endTime, bufferTime),
      }));

      const freeSlots = calculateFreeSlots(fullDayHours, combinedUnavailableTimes);
      freeSlots.forEach((slot) => {
        dayAvailability.push(`${to12Hour(slot.start)} - ${to12Hour(slot.end)}`);
      });
    }

    const dayDiv = document.createElement("div");
    dayDiv.innerHTML = `<strong>${day}:</strong> ${
      dayAvailability.length ? dayAvailability.join(", ") : "No Availability"
    }`;
    availabilityOutput.appendChild(dayDiv);
  }
});


// Adjust time
function adjustTime(time, hours) {
  const [h, m] = time.split(":").map(Number);
  const newTime = new Date();
  newTime.setHours(h + hours, m, 0, 0);
  return newTime.toTimeString().slice(0, 5);
}

// Calculate free slots
function calculateFreeSlots(fullDay, unavailableTimes) {
  let freeSlots = [{ ...fullDay }];

  // Remove unavailable times from free slots
  unavailableTimes.forEach(({ start, end }) => {
    freeSlots = freeSlots.flatMap((slot) => {
      if (end <= slot.start || start >= slot.end) return [slot];
      const splits = [];
      if (start > slot.start) splits.push({ start: slot.start, end: start });
      if (end < slot.end) splits.push({ start: end, end: slot.end });
      return splits;
    });
  });

  return freeSlots;
}

// Download the availability report as a PDF
document.getElementById("download-pdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf; // Import jsPDF
  const doc = new jsPDF();

  let yPosition = 10; // Vertical position for text in the PDF
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Weekly Availability Report", 10, yPosition);
  yPosition += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  // Generate the availability content from the report
  const availabilityContent = [];
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    const unavailableTimes = schedule[day] || [];
    const fullDayHours = { start: "08:00", end: "22:00" };

    if (unavailableTimes.length === 0) {
      availabilityContent.push(`${day}: ${fullDayHours.start} - ${to12Hour(fullDayHours.end)}`);
    } else {
      const combinedUnavailableTimes = unavailableTimes.map(({ startTime, endTime, bufferTime }) => ({
        start: adjustTime(startTime, -bufferTime),
        end: adjustTime(endTime, bufferTime),
      }));
      const freeSlots = calculateFreeSlots(fullDayHours, combinedUnavailableTimes);
      const slotsText = freeSlots.map(slot => `${to12Hour(slot.start)} - ${to12Hour(slot.end)}`).join(", ");
      availabilityContent.push(`${day}: ${slotsText || "No Availability"}`);
    }
  }

  // Add availability content to PDF
  availabilityContent.forEach((line) => {
    doc.text(line, 10, yPosition);
    yPosition += 8;
    if (yPosition > 280) { // Add new page if content overflows
      doc.addPage();
      yPosition = 10;
    }
  });

  // Save PDF
  doc.save("Availability_Report.pdf");
});


// Download as Excel
document.getElementById("download-excel").addEventListener("click", () => {
  let content = "Day,Availability\n";
  for (const day of document.getElementById("availability").children) {
    content += `${day.innerText}\n`;
  }
  const blob = new Blob([content], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Weekly_Shift_Planner.csv";
  link.click();
});
