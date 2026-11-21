// English string resources with TypeScript typing

/**
 * English string constants for the application
 * Provides type-safe access to all UI strings
 */
export const STRINGS = {
    // Common UI elements
    common: {
        // Navigation
        home: 'Home',
        dashboard: 'Dashboard',
        students: 'Students',
        drivers: 'Drivers',
        reports: 'Reports',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login',
        register: 'Register',

        // Actions
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        remove: 'Remove',
        update: 'Update',
        create: 'Create',
        submit: 'Submit',
        reset: 'Reset',
        clear: 'Clear',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        export: 'Export',
        import: 'Import',

        // Status
        loading: 'Loading...',
        saving: 'Saving...',
        deleting: 'Deleting...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',

        // Generic
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        close: 'Close',
        open: 'Open',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        finish: 'Finish',
        continue: 'Continue',

        // Validation
        required: 'This field is required',
        invalid: 'Invalid value',
        tooShort: 'Value is too short',
        tooLong: 'Value is too long',
        invalidEmail: 'Please enter a valid email address',
        invalidPhone: 'Please enter a valid phone number',
        invalidDate: 'Please enter a valid date',
        passwordsDontMatch: 'Passwords do not match',
    },

    // Authentication
    auth: {
        // Login
        signIn: 'Sign In',
        signInTitle: 'Welcome Back',
        signInSubtitle: 'Please sign in to your account',
        email: 'Email',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        signInWithGoogle: 'Sign in with Google',
        signInWithGuest: 'Continue as Guest',

        // Registration
        signUp: 'Sign Up',
        signUpTitle: 'Create Account',
        signUpSubtitle: 'Join us today',
        firstName: 'First Name',
        lastName: 'Last Name',
        confirmPassword: 'Confirm Password',
        agreeToTerms: 'I agree to the Terms of Service',
        alreadyHaveAccount: 'Already have an account?',

        // Password reset
        resetPassword: 'Reset Password',
        resetPasswordTitle: 'Forgot your password?',
        resetPasswordSubtitle: 'Enter your email to receive reset instructions',
        sendResetLink: 'Send Reset Link',
        backToSignIn: 'Back to Sign In',

        // Profile
        myProfile: 'My Profile',
        editProfile: 'Edit Profile',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmNewPassword: 'Confirm New Password',

        // Errors
        invalidCredentials: 'Invalid email or password',
        accountNotFound: 'Account not found',
        accountLocked: 'Account is locked',
        passwordTooWeak: 'Password is too weak',
        emailAlreadyExists: 'Email already exists',
        registrationFailed: 'Registration failed',
        loginFailed: 'Login failed',
        logoutFailed: 'Logout failed',
        sessionExpired: 'Session expired',
        accessDenied: 'Access denied',
    },

    // Students
    students: {
        // List
        allStudents: 'All Students',
        addStudent: 'Add Student',
        studentList: 'Student List',
        noStudents: 'No students found',
        searchStudents: 'Search students...',

        // Form
        studentDetails: 'Student Details',
        personalInfo: 'Personal Information',
        contactInfo: 'Contact Information',
        academicInfo: 'Academic Information',
        studentId: 'Student ID',
        fullName: 'Full Name',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        grade: 'Grade',
        section: 'Section',
        rollNumber: 'Roll Number',
        bloodGroup: 'Blood Group',
        address: 'Address',
        city: 'City',
        state: 'State',
        zipCode: 'ZIP Code',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: 'Emergency Phone',
        medicalInfo: 'Medical Information',
        allergies: 'Allergies',
        medications: 'Medications',

        // Actions
        viewStudent: 'View Student',
        editStudent: 'Edit Student',
        deleteStudent: 'Delete Student',
        exportStudents: 'Export Students',
        importStudents: 'Import Students',

        // Status
        active: 'Active',
        inactive: 'Inactive',
        graduated: 'Graduated',
        transferred: 'Transferred',

        // Messages
        studentAdded: 'Student added successfully',
        studentUpdated: 'Student updated successfully',
        studentDeleted: 'Student deleted successfully',
        confirmDeleteStudent: 'Are you sure you want to delete this student?',
    },

    // Drivers
    drivers: {
        // List
        allDrivers: 'All Drivers',
        addDriver: 'Add Driver',
        driverList: 'Driver List',
        noDrivers: 'No drivers found',
        searchDrivers: 'Search drivers...',

        // Form
        driverDetails: 'Driver Details',
        licenseInfo: 'License Information',
        vehicleInfo: 'Vehicle Information',
        driverId: 'Driver ID',
        licenseNumber: 'License Number',
        licenseExpiry: 'License Expiry',
        vehicleNumber: 'Vehicle Number',
        vehicleType: 'Vehicle Type',
        route: 'Route',
        experience: 'Experience (years)',

        // Actions
        viewDriver: 'View Driver',
        editDriver: 'Edit Driver',
        deleteDriver: 'Delete Driver',
        assignRoute: 'Assign Route',
        viewSchedule: 'View Schedule',

        // Status
        available: 'Available',
        busy: 'Busy',
        offDuty: 'Off Duty',
        onLeave: 'On Leave',

        // Messages
        driverAdded: 'Driver added successfully',
        driverUpdated: 'Driver updated successfully',
        driverDeleted: 'Driver deleted successfully',
        confirmDeleteDriver: 'Are you sure you want to delete this driver?',
    },

    // Dashboard
    dashboard: {
        welcome: 'Welcome back',
        overview: 'Overview',
        quickStats: 'Quick Statistics',
        recentActivity: 'Recent Activity',
        totalStudents: 'Total Students',
        totalDrivers: 'Total Drivers',
        activeRoutes: 'Active Routes',
        todayPickups: 'Today\'s Pickups',
        todayDropoffs: 'Today\'s Drop-offs',
        systemAlerts: 'System Alerts',
        noAlerts: 'No alerts at this time',
        viewAll: 'View All',
        refresh: 'Refresh',
    },

    // Reports
    reports: {
        // Navigation
        allReports: 'All Reports',
        generateReport: 'Generate Report',
        reportHistory: 'Report History',

        // Types
        studentReport: 'Student Report',
        driverReport: 'Driver Report',
        attendanceReport: 'Attendance Report',
        performanceReport: 'Performance Report',
        summaryReport: 'Summary Report',

        // Filters
        dateRange: 'Date Range',
        reportType: 'Report Type',
        format: 'Format',
        includeInactive: 'Include Inactive',

        // Formats
        pdf: 'PDF',
        excel: 'Excel',
        csv: 'CSV',

        // Actions
        generate: 'Generate',
        download: 'Download',
        print: 'Print',
        schedule: 'Schedule',

        // Status
        generating: 'Generating...',
        completed: 'Completed',
        failed: 'Failed',
    },

    // Chat/AI
    chat: {
        // Interface
        aiAssistant: 'AI Assistant',
        typeMessage: 'Type your message...',
        send: 'Send',
        clear: 'Clear Chat',
        chatHistory: 'Chat History',

        // Messages
        thinking: 'AI is thinking...',
        errorMessage: 'Sorry, I encountered an error. Please try again.',
        noResponse: 'I didn\'t understand that. Can you rephrase?',
        welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?',

        // Features
        askQuestion: 'Ask a question',
        getHelp: 'Get help',
        analyzeData: 'Analyze data',
        generateReport: 'Generate report',

        // Settings
        chatSettings: 'Chat Settings',
        language: 'Language',
        responseStyle: 'Response Style',
        concise: 'Concise',
        detailed: 'Detailed',
    },

    // Errors
    errors: {
        // Generic
        somethingWentWrong: 'Something went wrong',
        tryAgain: 'Please try again',
        contactSupport: 'Contact support if the problem persists',

        // Network
        networkError: 'Network error',
        connectionLost: 'Connection lost',
        serverError: 'Server error',
        timeout: 'Request timeout',

        // Validation
        validationError: 'Validation error',
        invalidInput: 'Invalid input',
        missingRequired: 'Missing required information',

        // Authentication
        authError: 'Authentication error',
        unauthorized: 'Unauthorized access',
        forbidden: 'Access forbidden',
        tokenExpired: 'Session expired',

        // Data
        dataError: 'Data error',
        notFound: 'Resource not found',
        alreadyExists: 'Resource already exists',
        operationFailed: 'Operation failed',

        // File
        fileError: 'File error',
        uploadFailed: 'Upload failed',
        downloadFailed: 'Download failed',
        invalidFile: 'Invalid file format',
    },

    // Success
    success: {
        // Generic
        operationCompleted: 'Operation completed successfully',
        dataSaved: 'Data saved successfully',
        dataDeleted: 'Data deleted successfully',
        dataUpdated: 'Data updated successfully',

        // Authentication
        loginSuccess: 'Login successful',
        logoutSuccess: 'Logout successful',
        passwordChanged: 'Password changed successfully',
        profileUpdated: 'Profile updated successfully',

        // Data operations
        studentSaved: 'Student information saved',
        driverSaved: 'Driver information saved',
        reportGenerated: 'Report generated successfully',
        importCompleted: 'Import completed successfully',
    },

    // Validation messages
    validation: {
        // Required fields
        requiredField: 'This field is required',
        requiredEmail: 'Email is required',
        requiredPassword: 'Password is required',
        requiredName: 'Name is required',

        // Format validation
        invalidEmail: 'Please enter a valid email address',
        invalidPhone: 'Please enter a valid phone number',
        invalidDate: 'Please enter a valid date',
        invalidNumber: 'Please enter a valid number',

        // Length validation
        tooShort: 'Value is too short (minimum {{min}} characters)',
        tooLong: 'Value is too long (maximum {{max}} characters)',
        passwordTooShort: 'Password must be at least {{min}} characters',

        // Range validation
        outOfRange: 'Value is out of range',
        invalidAge: 'Please enter a valid age',

        // Custom validation
        passwordsDontMatch: 'Passwords do not match',
        invalidStudentId: 'Invalid student ID format',
        invalidDriverId: 'Invalid driver ID format',
    },

    // Date and time
    datetime: {
        today: 'Today',
        yesterday: 'Yesterday',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
        date: 'Date',
        time: 'Time',
        from: 'From',
        to: 'To',
        duration: 'Duration',
        timezone: 'Timezone',
    },

    // Accessibility
    a11y: {
        // Screen reader
        srOnly: 'Screen reader only',
        skipToMain: 'Skip to main content',
        menu: 'Menu',
        closeMenu: 'Close menu',

        // ARIA labels
        openDialog: 'Open dialog',
        closeDialog: 'Close dialog',
        loadingSpinner: 'Loading',
        errorMessage: 'Error message',
        successMessage: 'Success message',

        // Keyboard navigation
        useArrowsToNavigate: 'Use arrow keys to navigate',
        pressEnterToSelect: 'Press Enter to select',
        pressEscapeToClose: 'Press Escape to close',
        pressTabToNavigate: 'Press Tab to navigate',

        // Help
        keyboardShortcuts: 'Keyboard shortcuts',
        help: 'Help',
        showHelp: 'Show help',
        hideHelp: 'Hide help',
    },

    // Pagination
    pagination: {
        showing: 'Showing',
        of: 'of',
        items: 'items',
        perPage: 'per page',
        first: 'First',
        last: 'Last',
        next: 'Next',
        previous: 'Previous',
        goToPage: 'Go to page',
    },

    // Tooltips and help
    tooltips: {
        // Common actions
        editTooltip: 'Edit this item',
        deleteTooltip: 'Delete this item',
        viewTooltip: 'View details',
        addTooltip: 'Add new item',

        // Form help
        requiredFieldTooltip: 'This field is required',
        optionalFieldTooltip: 'This field is optional',
        formatHelpTooltip: 'Click for format help',

        // Status help
        activeTooltip: 'This item is active',
        inactiveTooltip: 'This item is inactive',
        pendingTooltip: 'This item is pending',

        // Feature help
        featureTooltip: 'Click to learn more about this feature',
        keyboardShortcutTooltip: 'Keyboard shortcut available',
    },

    // Notifications
    notifications: {
        // Types
        toast: 'Toast notification',
        banner: 'Banner notification',
        modal: 'Modal notification',

        // Actions
        dismiss: 'Dismiss',
        viewDetails: 'View details',
        takeAction: 'Take action',

        // Positions
        topLeft: 'Top left',
        topRight: 'Top right',
        bottomLeft: 'Bottom left',
        bottomRight: 'Bottom right',
        topCenter: 'Top center',
        bottomCenter: 'Bottom center',
    },

    // Theme
    theme: {
        light: 'Light',
        dark: 'Dark',
        auto: 'Auto',
        highContrast: 'High Contrast',
        colorBlind: 'Color Blind Friendly',
        themeSettings: 'Theme Settings',
        fontSize: 'Font Size',
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
        extraLarge: 'Extra Large',
    },

    // Performance
    performance: {
        pageLoadTime: 'Page load time',
        responseTime: 'Response time',
        memoryUsage: 'Memory usage',
        networkActivity: 'Network activity',
        performanceMetrics: 'Performance Metrics',
        optimize: 'Optimize',
    }
} as const;

/**
 * Type-safe string keys for the English locale
 */
export type EnglishStringKey = keyof typeof STRINGS;

/**
 * Default export for the English strings
 */
export default STRINGS;