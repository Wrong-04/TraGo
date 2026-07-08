import { LanguageCode } from '../features/settings/settingsSlice';

export type Translations = {
  settings: {
    title: string;
    accountInfo: string;
    notifications: string;
    notificationsDescription: string;
    theme: string;
    themeDescription: string;
    language: string;
    distanceUnit: string;
    backup: string;
    backupDescription: string;
    rateApp: string;
    rateAppDescription: string;
    about: string;
    aboutDescription: string;
    logout: string;
    change: string;
    open: string;
    close: string;
    languageDialogTitle: string;
    distanceDialogTitle: string;
    aboutDialogTitle: string;
    closeButton: string;
    english: string;
    vietnamese: string;
    darkMode: string;
    lightMode: string;
    themeOn: string;
    themeOff: string;
    accountDetails: string;
  };
  profile: {
    personalInfo: string;
    savedTrips: string;
    savedPhotos: string;
    aiPlanner: string;
    notifications: string;
    settings: string;
    trips: string;
    locations: string;
    distance: string;
    userPlaceholder: string;
    editProfile: string;
    updateSuccess: string;
    updateError: string;
    save: string;
    fullName: string;
  };
  tabs: {
    home: string;
    trips: string;
    map: string;
    gallery: string;
    profile: string;
  };
  dashboard: {
    greeting: string;
    subtitle: string;
    trips: string;
    locations: string;
    totalDistance: string;
    photos: string;
    recentTrip: string;
    recentTripEmpty: string;
    recentTripHint: string;
    suggestions: string;
    aiPlannerTitle: string;
    aiPlannerDesc: string;
  };
  trips: {
    title: string;
    searchPlaceholder: string;
    all: string;
    upcoming: string;
    ongoing: string;
    completed: string;
    viewDetail: string;
    edit: string;
    favorite: string;
    delete: string;
    deleteTitle: string;
    deleteConfirm: string;
    cancel: string;
    retry: string;
    emptyTitle: string;
    emptySubtitle: string;
    createNew: string;
    days: string;
    places: string;
    statusPlanning: string;
    statusUpcoming: string;
    statusOngoing: string;
    statusCompleted: string;
  };
  tripDetail: {
    distanceLabel: string;
    costLabel: string;
    destinationsLabel: string;
    photosLabel: string;
    itinerary: string;
    map: string;
    expenses: string;
    journal: string;
    editTrip: string;
    noLocations: string;
    noLocationsText: string;
    noExpenses: string;
    noJournal: string;
    aiWeatherTitle: string;
    aiWeatherButton: string;
    aiWeatherLoading: string;
    aiWeatherError: string;
    aiExpenseTitle: string;
    aiExpenseButton: string;
    aiExpenseLoading: string;
  };
  auth: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    rememberMe: string;
    forgotPassword: string;
    login: string;
    register: string;
    googleLogin: string;
    alreadyHaveAccount: string;
    noAccount: string;
    loginNow: string;
    registerNow: string;
    fullNameRequired: string;
    passwordMismatch: string;
    passwordTooShort: string;
    emailPasswordRequired: string;
    loginFailed: string;
    registerFailed: string;
    googleFailed: string;
    googleCancelled: string;
    googleTokenMissing: string;
  };
  gallery: {
    title: string;
    all: string;
    location: string;
    date: string;
    uploadSuccess: string;
    loginRequired: string;
    uploadError: string;
  };
  photoDescription: {
    title: string;
    promptLabel: string;
    placeholder: string;
    button: string;
    resultLabel: string;
    hashtagsLabel: string;
    emptyPrompt: string;
    generateError: string;
    loadingText: string;
    copy: string;
    copiedSuccess: string;
    share: string;
    shareError: string;
  };
  aiPlanner: {
    back: string;
    title: string;
    subtitle: string;
    destinationLabel: string;
    daysLabel: string;
    budgetLabel: string;
    interestsLabel: string;
    loadingText: string;
    button: string;
    suggestionsTitle: string;
    suggestions: string[];
    loginRequired: string;
    createError: string;
    destinationRequired: string;
    daysRequired: string;
    budgetRequired: string;
    close: string;
    defaultTitle: string;
    defaultDesc: string;
    saveSuccess: string;
    recreate: string;
    saveTrip: string;
  };
  common: {
    kilometers: string;
    miles: string;
    appInfo: string;
    syncData: string;
    receiveNotifications: string;
    logout: string;
    save: string;
    cancel: string;
    close: string;
    retry: string;
    back: string;
    loading: string;
    days: string;
    locations: string;
    photos: string;
    distance: string;
    edit: string;
    delete: string;
  };
};

export const translations: Record<LanguageCode, Translations> = {
  vi: {
    settings: {
      title: 'Cài đặt',
      accountInfo: 'Thông tin tài khoản',
      notifications: 'Thông báo',
      notificationsDescription: 'Nhận thông báo ứng dụng',
      theme: 'Chủ đề',
      themeDescription: 'Chọn giao diện sáng / tối',
      language: 'Ngôn ngữ',
      distanceUnit: 'Đơn vị khoảng cách',
      backup: 'Sao lưu & đồng bộ',
      backupDescription: 'Đồng bộ dữ liệu trên thiết bị',
      rateApp: 'Đánh giá ứng dụng',
      rateAppDescription: 'Để lại đánh giá trên cửa hàng',
      about: 'Giới thiệu',
      aboutDescription: 'Thông tin về ứng dụng',
      logout: 'Đăng xuất',
      change: 'Thay đổi',
      open: 'Mở',
      close: 'Đóng',
      languageDialogTitle: 'Ngôn ngữ',
      distanceDialogTitle: 'Đơn vị khoảng cách',
      aboutDialogTitle: 'Giới thiệu',
      closeButton: 'Đóng',
      english: 'English',
      vietnamese: 'Tiếng Việt',
      darkMode: 'Dark',
      lightMode: 'Light',
      themeOn: 'Chế độ tối',
      themeOff: 'Chế độ sáng',
      accountDetails: 'Chi tiết',
    },
    profile: {
      personalInfo: 'Thông tin cá nhân',
      savedTrips: 'Chuyến đi đã lưu',
      savedPhotos: 'Ảnh đã lưu',
      aiPlanner: 'Lịch trình AI',
      notifications: 'Thông báo',
      settings: 'Cài đặt',
      trips: 'Chuyến đi',
      locations: 'Địa điểm',
      distance: 'Quãng đường',
      userPlaceholder: 'Người dùng',
      editProfile: 'Chỉnh sửa hồ sơ',
      updateSuccess: 'Cập nhật thành công!',
      updateError: 'Lỗi cập nhật',
      save: 'Lưu thay đổi',
      fullName: 'Họ và tên',
    },
    tabs: {
      home: 'Trang chủ',
      trips: 'Chuyến đi',
      map: 'Bản đồ',
      gallery: 'Thư viện',
      profile: 'Cá nhân',
    },
    dashboard: {
      greeting: 'Xin chào',
      subtitle: 'Cùng khám phá những hành trình mới',
      trips: 'Chuyến đi',
      locations: 'Địa điểm',
      totalDistance: 'Tổng quãng đường',
      photos: 'Ảnh đã lưu',
      recentTrip: 'Chuyến đi gần nhất',
      recentTripEmpty: 'Chưa có chuyến đi',
      recentTripHint: 'Hãy thêm chuyến đi mới',
      suggestions: 'Gợi ý cho bạn',
      aiPlannerTitle: 'AI Trip Planner',
      aiPlannerDesc: 'Tạo lịch trình du lịch với AI',
    },
    trips: {
      title: 'Chuyến đi của tôi',
      searchPlaceholder: 'Tìm kiếm chuyến đi...',
      all: 'Tất cả',
      upcoming: 'Sắp tới',
      ongoing: 'Đang diễn ra',
      completed: 'Đã hoàn thành',
      viewDetail: 'Xem chi tiết',
      edit: 'Sửa',
      favorite: 'Thêm vào yêu thích',
      delete: 'Xóa',
      deleteTitle: 'Xóa chuyến đi',
      deleteConfirm: 'Bạn có chắc chắn muốn xóa chuyến đi',
      cancel: 'Hủy',
      retry: 'Thử lại',
      emptyTitle: 'Chưa có chuyến đi nào',
      emptySubtitle: 'Hãy bắt đầu hành trình của bạn ngay hôm nay!',
      createNew: 'Tạo chuyến đi mới',
      days: 'ngày',
      places: 'địa điểm',
      statusPlanning: 'Lên kế hoạch',
      statusUpcoming: 'Sắp tới',
      statusOngoing: 'Đang diễn ra',
      statusCompleted: 'Đã hoàn thành',
    },
    tripDetail: {
      distanceLabel: 'Quãng đường',
      costLabel: 'Chi phí',
      destinationsLabel: 'Điểm đến',
      photosLabel: 'Ảnh',
      itinerary: 'Lịch trình',
      map: 'Bản đồ',
      expenses: 'Chi phí',
      journal: 'Nhật ký',
      editTrip: 'Sửa chuyến đi',
      noLocations: 'Chưa có địa điểm nào.',
      noLocationsText: 'Hãy thêm điểm đến hoặc lịch trình để bắt đầu',
      noExpenses: 'Chưa có chi phí nào.',
      noJournal: 'Chưa có nhật ký nào.',
      aiWeatherTitle: 'Trợ lý Thời tiết & Lịch trình',
      aiWeatherButton: 'Phân tích Thời tiết',
      aiWeatherLoading: 'Đang phân tích thời tiết...',
      aiWeatherError: 'Không thể lấy thông tin thời tiết lúc này.',
      aiExpenseTitle: 'Trợ lý Tài chính AI',
      aiExpenseButton: 'Phân tích Chi tiêu',
      aiExpenseLoading: 'Đang phân tích chi tiêu...',
    },
    auth: {
      welcomeTitle: 'Chào mừng trở lại! 👋',
      welcomeSubtitle: 'Đăng nhập để tiếp tục hành trình',
      fullName: 'Họ và tên',
      email: 'Email',
      password: 'Mật khẩu',
      confirmPassword: 'Xác nhận mật khẩu',
      rememberMe: 'Ghi nhớ đăng nhập',
      forgotPassword: 'Quên mật khẩu?',
      login: 'Đăng nhập',
      register: 'Đăng ký',
      googleLogin: 'Đăng nhập bằng Google',
      alreadyHaveAccount: 'Đã có tài khoản?',
      noAccount: 'Chưa có tài khoản?',
      loginNow: 'Đăng nhập ngay',
      registerNow: 'Đăng ký ngay',
      fullNameRequired: 'Vui lòng nhập Họ và tên.',
      passwordMismatch: 'Mật khẩu xác nhận không khớp.',
      passwordTooShort: 'Mật khẩu quá yếu! Yêu cầu ít nhất 8 ký tự.',
      emailPasswordRequired: 'Vui lòng nhập email và mật khẩu',
      loginFailed: 'Đăng nhập thất bại',
      registerFailed: 'Đăng ký thất bại',
      googleFailed: 'Đăng nhập Google thất bại',
      googleCancelled: 'Đã hủy hoặc xảy ra lỗi khi đăng nhập Google.',
      googleTokenMissing: 'Lỗi: Không nhận được token từ Google.',
    },
    gallery: {
      title: 'Ảnh đã lưu',
      all: 'Tất cả',
      location: 'Địa điểm',
      date: 'Theo ngày',
      uploadSuccess: 'Tải ảnh lên thành công!',
      loginRequired: 'Vui lòng đăng nhập để tải ảnh lên.',
      uploadError: 'Lỗi khi tải ảnh lên.',
    },
    photoDescription: {
      title: 'AI Mô tả ảnh',
      promptLabel: 'Mô tả ngắn gọn về ảnh',
      placeholder: 'Ví dụ: Buổi hoàng hôn ở Hội An, đèn lồng sáng rực',
      button: 'Tạo mô tả AI',
      resultLabel: 'Mô tả đề xuất',
      hashtagsLabel: 'Hashtags',
      emptyPrompt: 'Vui lòng nhập mô tả ngắn gọn về bức ảnh.',
      generateError: 'Không thể tạo mô tả ảnh.',
      loadingText: 'Đang tạo mô tả...',
      copy: 'Sao chép',
      copiedSuccess: 'Sao chép thành công!',
      share: 'Chia sẻ',
      shareError: 'Lỗi khi chia sẻ',
    },
    aiPlanner: {
      back: 'Quay lại',
      title: 'Tạo Lịch Trình AI',
      subtitle: 'Nhập thông tin chuyến đi để Gemini lên kế hoạch chi tiết cho bạn!',
      destinationLabel: 'Điểm đến (VD: Đà Lạt, Kyoto)',
      daysLabel: 'Số ngày (VD: 3)',
      budgetLabel: 'Ngân sách (VNĐ, VD: 5000000)',
      interestsLabel: 'Sở thích (VD: ẩm thực, thiên nhiên)',
      loadingText: 'Gemini đang tư duy...',
      button: 'Tạo Lịch Trình Tự Động',
      suggestionsTitle: 'Gợi ý cho bạn',
      suggestions: ['Trăng mật', 'Phượt mạo hiểm', 'Gia đình', 'Nghỉ dưỡng', 'Chụp ảnh'],
      loginRequired: 'Vui lòng đăng nhập để tạo chuyến đi.',
      createError: 'Có lỗi xảy ra khi tạo lịch trình bằng AI.',
      destinationRequired: 'Điểm đến không được để trống',
      daysRequired: 'Số ngày không được để trống',
      budgetRequired: 'Ngân sách dự kiến',
      close: 'Đóng',
      defaultTitle: 'Khám phá',
      defaultDesc: 'Lịch trình được tạo bởi AI',
      saveSuccess: 'Lịch trình đã được lưu!',
      recreate: 'Tạo lại',
      saveTrip: 'Lưu lịch trình',
    },
    common: {
      kilometers: 'km',
      miles: 'mi',
      appInfo: 'TraGo là ứng dụng quản lý hành trình cá nhân, cho phép lưu trữ chuyến đi, ảnh và các ghi chú quan trọng.',
      syncData: 'Đồng bộ dữ liệu trên thiết bị',
      receiveNotifications: 'Nhận thông báo ứng dụng',
      logout: 'Đăng xuất',
      save: 'Lưu',
      cancel: 'Hủy',
      close: 'Đóng',
      retry: 'Thử lại',
      back: 'Quay lại',
      loading: 'Đang tải',
      days: 'ngày',
      locations: 'địa điểm',
      photos: 'Ảnh',
      distance: 'Quãng đường',
      edit: 'Sửa',
      delete: 'Xóa',
    },
  },
  en: {
    settings: {
      title: 'Settings',
      accountInfo: 'Account information',
      notifications: 'Notifications',
      notificationsDescription: 'Receive app notifications',
      theme: 'Theme',
      themeDescription: 'Choose light / dark appearance',
      language: 'Language',
      distanceUnit: 'Distance unit',
      backup: 'Backup & Sync',
      backupDescription: 'Sync device data',
      rateApp: 'Rate App',
      rateAppDescription: 'Leave a review in the store',
      about: 'About',
      aboutDescription: 'App information',
      logout: 'Logout',
      change: 'Change',
      open: 'Open',
      close: 'Close',
      languageDialogTitle: 'Language',
      distanceDialogTitle: 'Distance unit',
      aboutDialogTitle: 'About',
      closeButton: 'Close',
      english: 'English',
      vietnamese: 'Tiếng Việt',
      darkMode: 'Dark',
      lightMode: 'Light',
      themeOn: 'Dark mode',
      themeOff: 'Light mode',
      accountDetails: 'Details',
    },
    profile: {
      personalInfo: 'Personal Info',
      savedTrips: 'Saved Trips',
      savedPhotos: 'Saved Photos',
      aiPlanner: 'AI Planner',
      notifications: 'Notifications',
      settings: 'Settings',
      trips: 'Trips',
      locations: 'Locations',
      distance: 'Distance',
      userPlaceholder: 'User',
      editProfile: 'Edit Profile',
      updateSuccess: 'Updated successfully!',
      updateError: 'Update failed',
      save: 'Save Changes',
      fullName: 'Full Name',
    },
    tabs: {
      home: 'Home',
      trips: 'Trips',
      map: 'Map',
      gallery: 'Gallery',
      profile: 'Profile',
    },
    dashboard: {
      greeting: 'Hello',
      subtitle: 'Let’s discover new adventures',
      trips: 'Trips',
      locations: 'Locations',
      totalDistance: 'Total distance',
      photos: 'Saved photos',
      recentTrip: 'Most recent trip',
      recentTripEmpty: 'No trips yet',
      recentTripHint: 'Add a new trip now',
      suggestions: 'Recommended for you',
      aiPlannerTitle: 'AI Trip Planner',
      aiPlannerDesc: 'Create a travel itinerary with AI',
    },
    trips: {
      title: 'My Trips',
      searchPlaceholder: 'Search trips...',
      all: 'All',
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      completed: 'Completed',
      viewDetail: 'View details',
      edit: 'Edit',
      favorite: 'Add to favorites',
      delete: 'Delete',
      deleteTitle: 'Delete trip',
      deleteConfirm: 'Are you sure you want to delete the trip',
      cancel: 'Cancel',
      retry: 'Retry',
      emptyTitle: 'No trips yet',
      emptySubtitle: 'Start your journey today!',
      createNew: 'Create new trip',
      days: 'days',
      places: 'places',
      statusPlanning: 'Planning',
      statusUpcoming: 'Upcoming',
      statusOngoing: 'Ongoing',
      statusCompleted: 'Completed',
    },
      tripDetail: {
        distanceLabel: 'Distance',
        costLabel: 'Cost',
        destinationsLabel: 'Destinations',
        photosLabel: 'Photos',
        itinerary: 'Itinerary',
        map: 'Map',
        expenses: 'Expenses',
        journal: 'Journal',
        editTrip: 'Edit trip',
        noLocations: 'No destinations yet.',
        noLocationsText: 'Add a stop to get started',
        noExpenses: 'No expenses yet.',
        noJournal: 'No journal entries yet.',
        aiWeatherTitle: 'AI Weather & Itinerary Advisor',
        aiWeatherButton: 'Analyze Weather',
        aiWeatherLoading: 'Analyzing weather...',
        aiWeatherError: 'Unable to fetch weather info right now.',
        aiExpenseTitle: 'AI Financial Advisor',
        aiExpenseButton: 'Analyze Expenses',
        aiExpenseLoading: 'Analyzing expenses...',
      },
      auth: {
        welcomeTitle: 'Welcome back! 👋',
        welcomeSubtitle: 'Sign in to continue your journey',
        fullName: 'Full name',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        login: 'Sign in',
        register: 'Sign up',
        googleLogin: 'Continue with Google',
        alreadyHaveAccount: 'Already have an account?',
        noAccount: 'Don’t have an account?',
        loginNow: 'Sign in now',
        registerNow: 'Sign up now',
        fullNameRequired: 'Please enter your full name.',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password is too weak! Minimum 8 characters required.',
        emailPasswordRequired: 'Please enter your email and password',
        loginFailed: 'Sign in failed',
        registerFailed: 'Sign up failed',
        googleFailed: 'Google sign-in failed',
        googleCancelled: 'Google sign-in was cancelled or failed.',
        googleTokenMissing: 'Error: No Google token received.',
      },
      gallery: {
        title: 'Saved photos',
        all: 'All',
        location: 'Location',
        date: 'Date',
        uploadSuccess: 'Photo uploaded successfully!',
        loginRequired: 'Please sign in to upload a photo.',
        uploadError: 'Failed to upload photo.',
      },
      photoDescription: {
        title: 'AI Photo Description',
        promptLabel: 'Short description of the photo',
        placeholder: 'Example: Sunset in Hoi An, lantern lights glowing',
        button: 'Generate AI description',
        resultLabel: 'Suggested description',
        hashtagsLabel: 'Hashtags',
        emptyPrompt: 'Please enter a short description of the photo.',
        generateError: 'Unable to generate photo description.',
        loadingText: 'Generating description...',
        copy: 'Copy',
        copiedSuccess: 'Copied successfully!',
        share: 'Share',
        shareError: 'Error sharing',
      },
      aiPlanner: {
        back: 'Back',
        title: 'Create AI Itinerary',
        subtitle: 'Enter your trip details and let Gemini build a detailed plan for you!',
        destinationLabel: 'Destination (e.g. Da Lat, Kyoto)',
        daysLabel: 'Days (e.g. 3)',
        budgetLabel: 'Budget (VND, e.g. 5000000)',
        interestsLabel: 'Interests (e.g. food, nature)',
        loadingText: 'Gemini is thinking...',
        button: 'Create Automatic Itinerary',
        suggestionsTitle: 'Suggestions for you',
        suggestions: ['Honeymoon', 'Adventure trip', 'Family', 'Relaxation', 'Photography'],
        loginRequired: 'Please sign in to create a trip.',
        createError: 'Something went wrong while creating the AI itinerary.',
        destinationRequired: 'Destination cannot be empty',
        daysRequired: 'Days cannot be empty',
        budgetRequired: 'Estimated budget',
        close: 'Close',
        defaultTitle: 'Explore',
        defaultDesc: 'AI generated itinerary',
        saveSuccess: 'Itinerary saved!',
        recreate: 'Recreate',
        saveTrip: 'Save Trip',
      },
      common: {
        kilometers: 'km',
        miles: 'mi',
        appInfo: 'TraGo is a personal trip planner app for saving trips, photos, and travel notes.',
        syncData: 'Sync device data',
        receiveNotifications: 'Receive app notifications',
        logout: 'Logout',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        retry: 'Retry',
        back: 'Back',
        loading: 'Loading',
        days: 'days',
        locations: 'places',
        photos: 'Photos',
        distance: 'Distance',
        edit: 'Edit',
        delete: 'Delete',
      },
    },
  };
