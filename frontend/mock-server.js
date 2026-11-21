const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware setup
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock data with better structure
let students = [
    {
        id: "1",
        route: "I",
        name: "John Doe",
        father_name: "Father Doe",
        mobile: "1234567890",
        class_: "10",
        address: "Test Address",
        fees: 1000,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact_info: {
            primary_mobile: "1234567890",
            father_contact: "Father Doe"
        },
        location_details: {
            route_number: "I",
            full_address: "Test Address",
            area: "Test",
            coordinates: { lat: 0, lng: 0 }
        }
    },
    {
        id: "2",
        route: "II",
        name: "Jane Smith",
        father_name: "Father Smith",
        mobile: "9876543210",
        class_: "9",
        address: "Another Address",
        fees: 1500,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact_info: {
            primary_mobile: "9876543210",
            father_contact: "Father Smith"
        },
        location_details: {
            route_number: "II",
            full_address: "Another Address",
            area: "Another",
            coordinates: { lat: 0, lng: 0 }
        }
    }
];

// Mock drivers data
let drivers = [
    {
        id: "1",
        name: "Rajesh Kumar",
        route: "I",
        vehicle_number: "KA-01-1234",
        contact_number: "9876543210",
        status: "active",
        total_students: 25,
        created_at: new Date().toISOString()
    },
    {
        id: "2",
        name: "Suresh Patel",
        route: "II",
        vehicle_number: "KA-02-5678",
        contact_number: "8765432109",
        status: "active",
        total_students: 20,
        created_at: new Date().toISOString()
    }
];

// Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    });
});

// Drivers routes
app.get('/api/drivers', (req, res) => {
    res.json({
        drivers: drivers,
        total_count: drivers.length
    });
});

app.get('/api/drivers/:name', (req, res) => {
    const { name } = req.params;
    const driver = drivers.find(d => d.name.toLowerCase() === decodeURIComponent(name).toLowerCase());

    if (!driver) {
        return res.status(404).json({ detail: "Driver not found" });
    }

    // Get students for this driver
    const driverStudents = students.filter(s => s.route === driver.route);

    res.json(driverStudents);
});

app.get('/api/students', (req, res) => {
    const { skip = 0, limit = 100, q } = req.query;

    let filteredStudents = [...students];

    // Apply search filter if query provided
    if (q) {
        const queryLower = q.toLowerCase();
        filteredStudents = students.filter(student =>
            student.name.toLowerCase().includes(queryLower) ||
            student.father_name.toLowerCase().includes(queryLower) ||
            student.class_.toLowerCase().includes(queryLower) ||
            student.mobile.includes(queryLower) ||
            student.address.toLowerCase().includes(queryLower) ||
            student.route.toLowerCase().includes(queryLower)
        );
    }

    // Apply pagination
    const startIndex = parseInt(skip);
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    res.json({
        students: paginatedStudents,
        total_count: filteredStudents.length
    });
});

app.get('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const student = students.find(s => s.id === id);

    if (!student) {
        return res.status(404).json({ detail: "Student not found" });
    }

    res.json(student);
});

app.post('/api/students', (req, res) => {
    const newStudent = {
        id: String(students.length + 1),
        ...req.body
    };
    students.push(newStudent);
    res.json(newStudent);
});

app.put('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const studentIndex = students.findIndex(s => s.id === id);

    if (studentIndex === -1) {
        return res.status(404).json({ detail: "Student not found" });
    }

    students[studentIndex] = {
        ...students[studentIndex],
        ...req.body,
        updated_at: new Date().toISOString()
    };
    res.json(students[studentIndex]);
});

app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const studentIndex = students.findIndex(s => s.id === id);

    if (studentIndex === -1) {
        return res.status(404).json({ detail: "Student not found" });
    }

    const deletedStudent = students.splice(studentIndex, 1)[0];
    res.json({
        message: `Student ${deletedStudent.name} deleted successfully`,
        deleted_id: id
    });
});

// Reports routes
app.get('/api/reports/summary', (req, res) => {
    const totalStudents = students.length;
    const totalDrivers = drivers.length;
    const totalRevenue = students.reduce((sum, student) => sum + (student.fees || 0), 0);

    const driversWithStudents = drivers.map(driver => ({
        driver_name: driver.name,
        student_count: students.filter(s => s.route === driver.route).length,
        revenue: students.filter(s => s.route === driver.route).reduce((sum, s) => sum + (s.fees || 0), 0)
    }));

    res.json({
        total_students: totalStudents,
        total_drivers: totalDrivers,
        total_revenue: totalRevenue,
        drivers: driversWithStudents
    });
});

app.get('/api/reports/driver-student-stats', (req, res) => {
    const totalDrivers = drivers.length;
    const totalStudents = students.length;
    const averageStudentsPerDriver = totalDrivers > 0 ? Math.round(totalStudents / totalDrivers) : 0;

    const driverStatistics = drivers.map(driver => ({
        driver_name: driver.name,
        student_count: students.filter(s => s.route === driver.route).length
    }));

    res.json({
        total_drivers: totalDrivers,
        total_students: totalStudents,
        average_students_per_driver: averageStudentsPerDriver,
        driver_statistics: driverStatistics
    });
});

app.get('/api/reports/revenue-analysis', (req, res) => {
    const revenueByDriver = {};
    const revenueByClass = {};

    students.forEach(student => {
        // Revenue by driver
        const driver = drivers.find(d => d.route === student.route);
        if (driver) {
            revenueByDriver[driver.name] = (revenueByDriver[driver.name] || 0) + (student.fees || 0);
        }

        // Revenue by class
        const classKey = student.class_ || 'Unknown';
        revenueByClass[classKey] = (revenueByClass[classKey] || 0) + (student.fees || 0);
    });

    res.json({
        revenue_by_driver: revenueByDriver,
        revenue_by_class: revenueByClass,
        total_revenue: Object.values(revenueByDriver).reduce((sum, rev) => sum + rev, 0)
    });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    // Simple mock response
    const responses = [
        "I understand you're asking about student transportation. How can I help you today?",
        "That's an interesting question about our school transport system. Let me provide you with some information.",
        "I can help you with information about drivers, students, routes, and reports. What would you like to know?",
        "Our transportation system is designed to be efficient and reliable. Is there something specific you'd like to discuss?"
    ];

    const mockResponse = responses[Math.floor(Math.random() * responses.length)];

    setTimeout(() => {
        res.json({
            response: mockResponse,
            timestamp: new Date().toISOString()
        });
    }, 500); // Simulate processing time
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        detail: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ detail: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server with error handling
const server = app.listen(PORT, () => {
    console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔄 CORS Origin: ${process.env.CORS_ORIGIN || 'all origins allowed'}`);
});

server.on('error', (err) => {
    console.error('Server startup error:', err);
    process.exit(1);
});

module.exports = app;