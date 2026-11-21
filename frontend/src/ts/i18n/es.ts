// Spanish string resources with TypeScript typing

/**
 * Spanish string constants for the application
 * Provides type-safe access to all UI strings in Spanish
 */
export const STRINGS = {
    // Common UI elements
    common: {
        // Navigation
        home: 'Inicio',
        dashboard: 'Panel de Control',
        students: 'Estudiantes',
        drivers: 'Conductores',
        reports: 'Reportes',
        settings: 'Configuración',
        profile: 'Perfil',
        logout: 'Cerrar Sesión',
        login: 'Iniciar Sesión',
        register: 'Registrarse',

        // Actions
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Agregar',
        remove: 'Remover',
        update: 'Actualizar',
        create: 'Crear',
        submit: 'Enviar',
        reset: 'Restablecer',
        clear: 'Limpiar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        export: 'Exportar',
        import: 'Importar',

        // Status
        loading: 'Cargando...',
        saving: 'Guardando...',
        deleting: 'Eliminando...',
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información',

        // Generic
        yes: 'Sí',
        no: 'No',
        ok: 'Aceptar',
        close: 'Cerrar',
        open: 'Abrir',
        back: 'Atrás',
        next: 'Siguiente',
        previous: 'Anterior',
        finish: 'Finalizar',
        continue: 'Continuar',

        // Validation
        required: 'Este campo es obligatorio',
        invalid: 'Valor inválido',
        tooShort: 'Valor demasiado corto',
        tooLong: 'Valor demasiado largo',
        invalidEmail: 'Por favor ingresa una dirección de correo válida',
        invalidPhone: 'Por favor ingresa un número de teléfono válido',
        invalidDate: 'Por favor ingresa una fecha válida',
        passwordsDontMatch: 'Las contraseñas no coinciden',
    },

    // Authentication
    auth: {
        // Login
        signIn: 'Iniciar Sesión',
        signInTitle: 'Bienvenido de Vuelta',
        signInSubtitle: 'Por favor inicia sesión en tu cuenta',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        rememberMe: 'Recordarme',
        forgotPassword: '¿Olvidaste tu contraseña?',
        signInWithGoogle: 'Iniciar sesión con Google',
        signInWithGuest: 'Continuar como Invitado',

        // Registration
        signUp: 'Registrarse',
        signUpTitle: 'Crear Cuenta',
        signUpSubtitle: 'Únete a nosotros hoy',
        firstName: 'Nombre',
        lastName: 'Apellido',
        confirmPassword: 'Confirmar Contraseña',
        agreeToTerms: 'Acepto los Términos de Servicio',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',

        // Password reset
        resetPassword: 'Restablecer Contraseña',
        resetPasswordTitle: '¿Olvidaste tu contraseña?',
        resetPasswordSubtitle: 'Ingresa tu correo para recibir instrucciones de restablecimiento',
        sendResetLink: 'Enviar Enlace de Restablecimiento',
        backToSignIn: 'Volver al Inicio de Sesión',

        // Profile
        myProfile: 'Mi Perfil',
        editProfile: 'Editar Perfil',
        changePassword: 'Cambiar Contraseña',
        currentPassword: 'Contraseña Actual',
        newPassword: 'Nueva Contraseña',
        confirmNewPassword: 'Confirmar Nueva Contraseña',

        // Errors
        invalidCredentials: 'Correo o contraseña inválidos',
        accountNotFound: 'Cuenta no encontrada',
        accountLocked: 'Cuenta bloqueada',
        passwordTooWeak: 'Contraseña demasiado débil',
        emailAlreadyExists: 'El correo ya existe',
        registrationFailed: 'Registro fallido',
        loginFailed: 'Inicio de sesión fallido',
        logoutFailed: 'Cierre de sesión fallido',
        sessionExpired: 'Sesión expirada',
        accessDenied: 'Acceso denegado',
    },

    // Students
    students: {
        // List
        allStudents: 'Todos los Estudiantes',
        addStudent: 'Agregar Estudiante',
        studentList: 'Lista de Estudiantes',
        noStudents: 'No se encontraron estudiantes',
        searchStudents: 'Buscar estudiantes...',

        // Form
        studentDetails: 'Detalles del Estudiante',
        personalInfo: 'Información Personal',
        contactInfo: 'Información de Contacto',
        academicInfo: 'Información Académica',
        studentId: 'ID del Estudiante',
        fullName: 'Nombre Completo',
        dateOfBirth: 'Fecha de Nacimiento',
        gender: 'Género',
        grade: 'Grado',
        section: 'Sección',
        rollNumber: 'Número de Lista',
        bloodGroup: 'Grupo Sanguíneo',
        address: 'Dirección',
        city: 'Ciudad',
        state: 'Estado',
        zipCode: 'Código Postal',
        emergencyContact: 'Contacto de Emergencia',
        emergencyPhone: 'Teléfono de Emergencia',
        medicalInfo: 'Información Médica',
        allergies: 'Alergias',
        medications: 'Medicamentos',

        // Actions
        viewStudent: 'Ver Estudiante',
        editStudent: 'Editar Estudiante',
        deleteStudent: 'Eliminar Estudiante',
        exportStudents: 'Exportar Estudiantes',
        importStudents: 'Importar Estudiantes',

        // Status
        active: 'Activo',
        inactive: 'Inactivo',
        graduated: 'Graduado',
        transferred: 'Transferido',

        // Messages
        studentAdded: 'Estudiante agregado exitosamente',
        studentUpdated: 'Estudiante actualizado exitosamente',
        studentDeleted: 'Estudiante eliminado exitosamente',
        confirmDeleteStudent: '¿Estás seguro de que quieres eliminar este estudiante?',
    },

    // Dashboard
    dashboard: {
        welcome: 'Bienvenido de vuelta',
        overview: 'Resumen',
        quickStats: 'Estadísticas Rápidas',
        recentActivity: 'Actividad Reciente',
        totalStudents: 'Total de Estudiantes',
        totalDrivers: 'Total de Conductores',
        activeRoutes: 'Rutas Activas',
        todayPickups: 'Recogidas de Hoy',
        todayDropoffs: 'Entregas de Hoy',
        systemAlerts: 'Alertas del Sistema',
        noAlerts: 'No hay alertas en este momento',
        viewAll: 'Ver Todo',
        refresh: 'Actualizar',
    },

    // Errors
    errors: {
        // Generic
        somethingWentWrong: 'Algo salió mal',
        tryAgain: 'Por favor intenta de nuevo',
        contactSupport: 'Contacta soporte si el problema persiste',

        // Network
        networkError: 'Error de red',
        connectionLost: 'Conexión perdida',
        serverError: 'Error del servidor',
        timeout: 'Tiempo de espera agotado',

        // Validation
        validationError: 'Error de validación',
        invalidInput: 'Entrada inválida',
        missingRequired: 'Información requerida faltante',

        // Authentication
        authError: 'Error de autenticación',
        unauthorized: 'Acceso no autorizado',
        forbidden: 'Acceso prohibido',
        tokenExpired: 'Sesión expirada',

        // Data
        dataError: 'Error de datos',
        notFound: 'Recurso no encontrado',
        alreadyExists: 'Recurso ya existe',
        operationFailed: 'Operación fallida',
    },

    // Success
    success: {
        // Generic
        operationCompleted: 'Operación completada exitosamente',
        dataSaved: 'Datos guardados exitosamente',
        dataDeleted: 'Datos eliminados exitosamente',
        dataUpdated: 'Datos actualizados exitosamente',

        // Authentication
        loginSuccess: 'Inicio de sesión exitoso',
        logoutSuccess: 'Cierre de sesión exitoso',
        passwordChanged: 'Contraseña cambiada exitosamente',
        profileUpdated: 'Perfil actualizado exitosamente',
    },

    // Validation messages
    validation: {
        // Required fields
        requiredField: 'Este campo es obligatorio',
        requiredEmail: 'El correo es obligatorio',
        requiredPassword: 'La contraseña es obligatoria',
        requiredName: 'El nombre es obligatorio',

        // Format validation
        invalidEmail: 'Por favor ingresa una dirección de correo válida',
        invalidPhone: 'Por favor ingresa un número de teléfono válido',
        invalidDate: 'Por favor ingresa una fecha válida',
        invalidNumber: 'Por favor ingresa un número válido',

        // Length validation
        tooShort: 'Valor demasiado corto (mínimo {{min}} caracteres)',
        tooLong: 'Valor demasiado largo (máximo {{max}} caracteres)',
        passwordTooShort: 'La contraseña debe tener al menos {{min}} caracteres',

        // Custom validation
        passwordsDontMatch: 'Las contraseñas no coinciden',
        invalidStudentId: 'Formato de ID de estudiante inválido',
        invalidDriverId: 'Formato de ID de conductor inválido',
    },

    // Date and time
    datetime: {
        today: 'Hoy',
        yesterday: 'Ayer',
        tomorrow: 'Mañana',
        thisWeek: 'Esta Semana',
        lastWeek: 'Semana Pasada',
        thisMonth: 'Este Mes',
        lastMonth: 'Mes Pasado',
        date: 'Fecha',
        time: 'Hora',
        from: 'Desde',
        to: 'Hasta',
        duration: 'Duración',
        timezone: 'Zona Horaria',
    },

    // Chat/AI
    chat: {
        // Interface
        aiAssistant: 'Asistente de IA',
        typeMessage: 'Escribe tu mensaje...',
        send: 'Enviar',
        clear: 'Limpiar Chat',
        chatHistory: 'Historial de Chat',

        // Messages
        thinking: 'La IA está pensando...',
        errorMessage: 'Lo siento, encontré un error. Por favor intenta de nuevo.',
        noResponse: 'No entendí eso. ¿Puedes reformular?',
        welcomeMessage: '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte hoy?',

        // Features
        askQuestion: 'Haz una pregunta',
        getHelp: 'Obtener ayuda',
        analyzeData: 'Analizar datos',
        generateReport: 'Generar reporte',
    }
} as const;

/**
 * Type-safe string keys for the Spanish locale
 */
export type SpanishStringKey = keyof typeof STRINGS;

/**
 * Default export for the Spanish strings
 */
export default STRINGS;