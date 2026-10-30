import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export type Language = "ar" | "en";
export type Direction = "rtl" | "ltr";

export interface I18nContextType {
  lang: Language;
  dir: Direction;
  isAr: boolean;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, defaultVal?: string) => string;
}

const STORAGE_KEY = "falfaisal_lang";

export const translations = {
  ar: {
    // Brand & Header
    company_name: "شركة فن الفيصل للإستقدام",
    company_subtitle: "منظومة إدارة وتدقيق معاملات التأشيرات والعمالة",
    app_desk: "لوحة إدارة العمليات والتأشيرات",
    tagline: "نظام إدارة وتدقيق معاملات التأشيرات والعمالة والكفلاء والمدفوعات",

    // Navigation
    nav_executive: "لوحة القيادة التنفيذية",
    nav_records: "المعاملات والتأشيرات",
    nav_hierarchy: "الدول والوكالات",
    nav_admins: "إدارة المشرفين والصلاحيات",
    nav_audit: "سجل العمليات والتدقيق",
    nav_sign_out: "تسجيل الخروج",

    // Executive Dashboard (Super Admin)
    exec_title: "لوحة القيادة التنفيذية للمدير العام",
    exec_subtitle: "متابعة استراتيجية فورية وشاملة لأداء المشرفين ومؤشرات الدول والوكالات المعتمدة",
    exec_badge: "المدير العام",
    exec_read_only_notice:
      "حساب المدير العام يملك صلاحيات المراقبة والمتابعة الشاملة لجميع السجلات. إضافة وتعديل المعاملات مخصص حصرياً للمشرف المسؤول عن الدولة.",
    exec_tab_overview: "نظرة عامة على المنظومة",
    exec_tab_admins: "أداء المشرفين وأحجام العمل",
    exec_tab_countries: "خطوط العمليات حسب الدول",
    exec_tab_agencies: "تفاصيل الوكالات وحالات التأشيرات",
    exec_active_records: "المعاملات النشطة",
    exec_completed_visas: "التأشيرات المنجزة",
    exec_canceled_apps: "المعاملات الملغاة",
    exec_paid_total: "إجمالي المبالغ المسددة",
    exec_unpaid_total: "المبالغ المعلقة وغير المسددة",
    exec_total_volume: "الحجم المالي الكلي",
    exec_completion_rate: "نسبة الإنجاز الكلية",
    exec_active_rate: "نسبة المعاملات النشطة",
    exec_admins_metrics_title: "المشرفون وأعباء العمل المخصصة",
    exec_admins_metrics_desc:
      "توزيع المشرفين المعتمدين، الدول والوكالات التابعة لهم، وحجم العمل المنجز والمعلق",
    exec_assigned_territories: "الدول التابعة للمشرف",
    exec_assigned_agencies: "الوكالات المعتمدة",
    exec_handled_volume: "إجمالي حجم المعاملات",
    exec_pending_workload: "أعباء عمل معلقة ومستمرة",
    exec_territory_finance: "المعاملات المالية للنطاق",
    exec_country_pipeline_title: "خطوط العمليات حسب الدول",
    exec_country_pipeline_desc: "توزيع مؤشرات الإنجاز والمبالغ المالية وحالات التأشيرات لكل دولة",
    exec_agency_drilldown_title: "التحليل التفصيلي لحالات التأشيرات حسب الوكالة",
    exec_agency_drilldown_desc:
      "توزيع دقيق بنسب مئوية لحالات التأشيرات الخمس المعتمدة لكل وكالة خارجية",
    exec_status_stamped: "تأشيرات تم التفييز لها",
    exec_status_trib: "إجراءات السفارة المكتملة",
    exec_status_paid: "وكالة مسددة",
    exec_status_unpaid: "وكالة غير مسددة",
    exec_status_canceled: "ملغاة",
    exec_all_countries: "كافة الدول",
    exec_search_agency: "بحث باسم الوكالة أو كود الدولة...",
    exec_search_admin: "بحث باسم المشرف أو البريد...",
    exec_no_admins_found: "لم يتم العثور على مشرفين مطابقين",
    exec_no_agencies_found: "لم يتم العثور على وكالات مطابقة",
    exec_export_executive: "تصدير التقرير التنفيذي",
    exec_refresh: "تحديث فوري للبيانات",
    exec_agency_count: "عدد الوكالات",
    exec_applications_count: "معاملة",
    exec_percentage_label: "النسبة",
    exec_count_label: "العدد",
    exec_heavy_workload: "عبء عمل مرتفع",
    exec_normal_workload: "عبء عمل مستقر",
    exec_view_records_for_country: "عرض معاملات هذه الدولة",

    // Roles & Scope
    role_super_admin: "المدير العام",
    role_admin: "مدير دولة",
    role_staff: "موظف عمليات",
    role_read_only: "اطلاع وقراءة فقط",
    scope_global: "وصول عام شامل لكافة الدول",
    scope_territory: "نطاق جغرافي مخصص",
    assigned_countries_label: "الدول المخصصة",
    no_country_assigned_warning: "تحذير: لا توجد دولة مخصصة",

    // Actions & Common
    new_record: "معاملة جديدة",
    new_country: "إضافة دولة جديدة",
    new_agency: "إضافة وكالة جديدة",
    new_admin: "إضافة مشرف جديد",
    assign_countries: "تخصيص الدول",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ التعديلات",
    cancel: "إلغاء",
    saving: "جاري الحفظ…",
    search_placeholder: "بحث باسم الكفيل، الهوية، الجواز، التأشيرة، الجوال…",
    clear_filters: "إلغاء التصفية",
    export_csv: "تصدير ملف بيانات",
    export_excel: "تصدير إكسل",
    export_pdf: "طباعة تقرير",
    print_slip: "طباعة سند المعاملة",
    view_details: "معاينة التفاصيل",
    actions: "الإجراءات",
    loading: "جاري التحميل…",
    no_records: "لا توجد معاملات مطابقة لخيارات البحث",
    total: "الإجمالي",
    records_count: "معاملة",
    showing: "عرض",
    to: "إلى",
    of: "من أصل",
    rows_per_page: "عدد السطور:",
    all: "الكل",
    system_user: "النظام",
    no_payload: "لا توجد بيانات تفصيلية",

    // Tabs
    tab_grid: "جدول المعاملات",
    tab_analytics: "التحليلات والمؤشرات",
    tab_overview: "بيانات المعاملة",
    tab_history: "سجل التدقيق والتغييرات",

    // Quick Filters & Status Rules (Pure Arabic, no mixed English)
    qf_all: "كافة المعاملات",
    qf_overdue: "المتأخرة (أكثر من 30 يوماً)",
    qf_embassy: "مرحلة السفارة",
    qf_arrived: "الوصول للمملكة",
    qf_visa_stamped: "تأشيرة صادرة",
    qf_trib: "تدريب مهني معتمد",
    qf_wekala_paid: "وكالة مسددة",
    qf_wekala_unpaid: "وكالة بانتظار السداد",
    qf_canceled: "معاملات ملغية",

    // Table Columns
    col_serial: "#",
    col_sponsor_name: "اسم الكفيل",
    col_sponsor_id: "الهوية / الإقامة",
    col_worker_name: "اسم العامل / المرشح",
    col_passport: "رقم الجواز",
    col_visa_no: "رقم التأشيرة",
    col_musaned_no: "رقم مساند",
    col_city: "المدينة",
    col_country: "الدولة",
    col_agency: "الوكالة الخارجية",
    col_medical: "الفحص الطبي",
    col_payment: "حالة السداد",
    col_visa_status: "مرحلة المعاملة والتأشيرة",
    col_amount: "المبلغ",
    col_date: "التاريخ",
    col_days: "الأيام",
    col_notes: "الملاحظات",
    collapse_sidebar: "تصغير القائمة الجانبية",
    expand_sidebar: "توسيع القائمة الجانبية",
    copy_to_clipboard: "نسخ إلى الحافظة",
    copied_to_clipboard: "تم النسخ إلى الحافظة",

    // Payment States (Pure Arabic)
    pay_PAID: "مدفوع",
    pay_PENDING: "معلق",
    pay_PARTIAL: "سداد جزئي",
    pay_UNPAID: "غير مدفوع",
    pay_REFUNDED: "مسترد",
    all_payments: "جميع حالات السداد",

    // Visa Statuses (Pure Arabic)
    visa_WKALA: "وكالة / تفويض",
    visa_EMBASSY: "بالسفارة",
    visa_VISA_STAMP: "تأشيرة صادرة",
    visa_TRIB: "تدريب مهني",
    visa_BIOMETRIC: "بصمة حيوية",
    visa_ARRIVED: "تم الوصول للمملكة",
    visa_CANCELLED: "ملغية",
    visa_CANCELED: "ملغية",
    all_visas: "جميع مراحل التأشيرة",

    // Medical States (Pure Arabic)
    med_FIT: "لائق طبياً",
    med_UNFIT: "غير لائق",
    med_PENDING: "بانتظار الفحص",
    all_medicals: "كافة الفحوصات الطبية",

    // KPIs & Metrics Strip (5 Status Color Rules + Total)
    kpi_total: "إجمالي المعاملات",
    kpi_paid: "سداد مكتمل",
    kpi_embassy: "مرحلة السفارة",
    kpi_training: "مرحلة التدريب",
    kpi_pending_pay: "دفعات معلقة",
    kpi_overdue: "معاملات متأخرة",
    kpi_contract_val: "قيمة العقود",
    kpi_settled_paid: "سداد مكتمل",
    kpi_collected: "المحصل",
    kpi_outstanding: "المتبقي للدفع",
    kpi_embassy_stamped: "السفارة والتأشيرات",
    kpi_fit_medical: "فحص لائق طبياً",
    kpi_trib_arrived: "تفويض ووصول",
    kpi_flight_ready: "جاهز للطيران",
    kpi_booked: "حجز مؤكد",
    kpi_wekala_paid: "وكالة مسددة",
    kpi_wekala_unpaid: "وكالة بانتظار السداد",
    kpi_visa_stamped: "تأشيرة صادرة",
    kpi_trib: "تدريب مهني معتمد",
    kpi_canceled: "معاملات ملغية",

    // Dropdown filters
    all_cities: "كافة المدن",
    all_countries: "كافة الدول المتاحة",
    all_agencies: "كافة الوكالات المعتمدة",
    quick_views: "تصفية سريعة:",
    density_comfortable: "عرض مريح",
    density_compact: "عرض مدمج",
    total_filtered: "إجمالي المبالغ المصفاة:",
    currency_sar: "ر.س",
    edit_record: "تعديل المعاملة",
    inspect_case: "معاينة المعاملة",
    delete_confirm: "هل أنت متأكد من حذف المعاملة رقم",
    record_deleted: "تم حذف المعاملة بنجاح",

    // Deletion Modal Safety
    confirm_delete_title: "تأكيد الحذف النهائي",
    confirm_delete_desc:
      "هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
    confirm_delete_btn: "تأكيد الحذف",
    confirm_delete_cancel: "إلغاء",

    // Export Confirmation & Feedback
    confirm_export_title: "تأكيد تحميل وتصدير الملف",
    confirm_export_desc: "هل أنت متأكد من رغبتك في تصدير البيانات الحالية بصيغة",
    confirm_download_btn: "تأكيد التحميل",
    export_scope_label: "نطاق السجلات المحددة للتصدير",
    format_csv: "ملف بيانات",
    format_excel: "جدول إكسل",
    format_pdf: "مستند بي دي إف",
    export_preparing: "جاري تحضير وتجهيز ملف التصدير…",
    export_ready: "تم تجهيز وتنزيل الملف بنجاح",

    // Analytics View
    analytics_contract_val: "إجمالي قيمة العقود",
    analytics_settled: "المبالغ المحصلة والمكتملة",
    analytics_pending: "المبالغ والذمم المعلقة",
    analytics_collection_rate: "نسبة التحصيل",
    analytics_medical_clearance: "الفحوصات الطبية",
    analytics_visa_dist: "توزيع مراحل التأشيرات",
    analytics_visa_dist_sub: "المعاملات النشطة حسب مرحلة الإجراء",
    analytics_payment_dist: "حالات السداد والتحصيل",
    analytics_payment_dist_sub: "نسبة المعاملات المسددة والمعلقة",
    analytics_top_cities: "المدن الأكثر طلباً واستقداماً",
    analytics_top_cities_sub: "تصنيف المعاملات حسب مدن المملكة",
    analytics_operational_health: "مؤشرات السلامة والسرعة التشغيلية",
    analytics_operational_health_sub: "متابعة الحالات الحرجة ومواعيد السفر",
    analytics_overdue_alert: "معاملات جارية لأكثر من 30 يوماً",
    analytics_unfit_alert: "فحوصات غير لائقة تتطلب استبدالاً",
    analytics_ticketed_alert: "تذاكر مؤكدة جاهزة للاستقبال بالمطار",
    active_case_records: "معاملة نشطة مسجلة",
    outstanding_records: "معاملة غير مكتملة السداد",
    city_unspecified: "غير محدد",

    // Detail & Inspection
    sec_travel: "السفر واللوجستيات",
    airport: "مطار الوصول",
    reserved_flight: "حجز الطيران",
    processing_date: "تاريخ المعالجة",
    created_at_label: "تاريخ الإنشاء",
    created_by_label: "بواسطة",
    updated_by_label: "آخر تعديل بواسطة",
    days_elapsed: "الأيام المنقضية",
    days_unit: "يوم",
    copied: "تم النسخ",
    copy_label: "نسخ",
    case_slip_title: "سند متابعة معاملة استقدام",
    no_worker_specified: "لم يتم تحديد اسم العامل",
    musaned_contract_no: "رقم عقد مساند",

    // Audit Trail
    audit_title: "سجل التدقيق والعمليات",
    audit_subtitle: "سجل رقمي موثق بالعمليات والتعديلات وتفاصيل التغييرات السابقة والجديدة.",
    audit_system_logs: "سجلات النظام",
    audit_showing_events: "أحداث مسجلة",
    audit_all_actions: "كافة الإجراءات",
    audit_insert: "إضافة جديدة",
    audit_update: "تعديل بيانات",
    audit_delete: "حذف سجل",
    audit_search_placeholder: "بحث بالمنفذ، رقم المعاملة، أو الحقل المعدل…",
    audit_timestamp: "الوقت والتاريخ",
    audit_actor: "المنفذ",
    audit_action: "نوع الإجراء",
    audit_record_no: "رقم المعاملة",
    audit_changes: "تفاصيل التعديلات والبيانات",
    audit_no_logs: "لا توجد سجلات تدقيق مطابقة لمعايير البحث",
    audit_loading: "جاري تحميل سجل التدقيق…",
    audit_history_count: "سجل التدقيق والتغييرات",

    // Countries & Hierarchy
    hierarchy_title: "الهيكل الهرمي: الدول والوكالات الخارجية",
    hierarchy_subtitle:
      "إدارة الدول المستهدفة والوكالات المعتمدة. كل دولة تضم وكالة واحدة على الأقل.",
    countries_count: "الدول",
    agencies_count: "الوكالات المعتمدة",
    initial_agency_required: "الوكالة الابتدائية الأولى للدولة (مطلوبة)",
    license_no: "رقم الترخيص",
    phone: "رقم الجوال / الهاتف",
    email: "البريد الإلكتروني",
    rule_country_agency: "قاعدة النظام: تتطلب كل دولة وجود وكالة واحدة على الأقل",
    country_dialog_title: "إضافة دولة جديدة",
    country_dialog_desc: "إضافة دولة جديدة مع وكالتها الابتدائية الأولى المعتمدة.",
    agency_dialog_title: "إضافة وكالة جديدة",
    agency_dialog_desc: "إضافة وكالة خارجية معتمدة جديدة للدولة المختارة.",
    country_name_label: "اسم الدولة",
    country_code_label: "رمز الدولة",
    agency_name_label: "اسم الوكالة الخارجية",
    agency_license_label: "رقم الترخيص",
    agency_phone_label: "رقم الهاتف",
    agency_email_label: "البريد الإلكتروني",
    confirm_delete_country: "هل أنت متأكد من حذف هذه الدولة وكافة وكالاتها؟",
    confirm_delete_agency: "هل أنت متأكد من حذف هذه الوكالة؟",
    country_agency_rule_err:
      "قاعدة النظام: لا يمكن حذف هذه الوكالة لأن كل دولة يجب أن تحتوي على وكالة واحدة على الأقل.",
    fill_required_err: "يرجى ملء جميع الحقول المطلوبة",
    country_created_success: "تمت إضافة الدولة والوكالة بنجاح!",
    agency_created_success: "تمت إضافة الوكالة بنجاح!",
    country_deleted_success: "تم حذف الدولة بنجاح",
    agency_deleted_success: "تم حذف الوكالة بنجاح",
    multi_tenant_badge: "عزل جغرافي متعدد",
    access_restricted_countries_desc:
      "إدارة الدول والوكالات الخارجية مقتصرة فقط على حسابات المدير العام.",
    country_code_title: "كود الدولة:",
    delete_country_tooltip: "حذف الدولة",
    delete_agency_tooltip: "حذف الوكالة",
    linked_agencies_label: "الوكالات الخارجية المرتبطة:",
    country_status_active: "نشط",

    // Admins & Roles
    admins_title: "إدارة المشرفين والصلاحيات",
    admins_subtitle: "إدارة حسابات مدراء الدول، ربط وتخصيص الدول، وتطبيق العزل المتعدد للمنظومة.",
    access_restricted: "صلاحية محظورة: هذه الصفحة مقتصرة على المدير العام فقط",
    access_restricted_users_desc:
      "إدارة حسابات المشرفين وتخصيص الدول مقتصرة فقط على حسابات المدير العام.",
    rule_admin_country: "قاعدة النظام: يجب تعيين دولة واحدة على الأقل لكل مدير",
    user_created_success: "تم إنشاء الحساب بنجاح",
    assignment_updated_success: "تم تحديث تخصيص الدول بنجاح",
    user_dialog_title: "إضافة مشرف جديد",
    user_dialog_desc: "إنشاء حساب مشرف جديد وتحديد الدور وتخصيص الدول المعتمدة.",
    edit_territory_title: "تعديل تخصيص الدول",
    edit_territory_desc: "تعديل النطاق الجغرافي والدول المتاحة لهذا المشرف.",
    user_role_label: "الدور والصلاحية",
    user_password_label: "كلمة المرور",
    select_countries_prompt: "حدد الدول المخصصة (دولة واحدة على الأقل للمدير):",
    cannot_delete_self: "لا يمكنك حذف حسابك الخاص.",
    confirm_delete_user: "هل أنت متأكد من حذف هذا الحساب؟",
    admin_requires_country: "قاعدة النظام: يجب تعيين دولة واحدة على الأقل لكل مدير.",
    user_deleted_success: "تم حذف الحساب بنجاح",
    admin_scope_count: "دول مخصصة",
    super_admins_count: "المدراء العامون:",
    admins_count: "مدراء الدول:",
    staff_count: "الموظفون:",
    role_card_super_title: "١. المدير العام",
    role_card_super_desc:
      "رؤية وإدارة كاملة لجميع الدول، الوكالات، المعاملات، الحسابات، وتعيين وإلغاء صلاحيات المشرفين.",
    role_card_admin_title: "٢. مدير دولة مخصص",
    role_card_admin_desc:
      "عزل كامل: يرى ويدير (إضافة، تعديل، حذف) فقط المعاملات التابعة للدول المخصصة له. لا يرى بيانات الدول الأخرى.",
    role_card_staff_title: "٣. موظف تدقيق واطلاع",
    role_card_staff_desc:
      "رؤية عامة لكافة المعاملات والدول بصفة قراءة فقط دون إمكانية التعديل أو الحذف أو الإضافة.",
    users_search_placeholder: "بحث بالاسم أو البريد الإلكتروني أو الصلاحية…",
    users_loading: "جاري تحميل المشرفين…",
    badge_your_account: "حسابك",
    scope_all_full: "كافة الدول والوكالات (وصول عام شامل)",
    scope_all_readonly: "كافة الدول والوكالات (اطلاع وقراءة فقط)",
    scope_warning_no_country: "تحذير: لا توجد دولة مخصصة",
    col_user_email: "المستخدم / البريد الإلكتروني",
    col_role: "الصلاحية",
    col_assigned_countries: "الدول المخصصة",
    col_admin_actions: "إجراءات الإدارة",
    delete_user_btn: "حذف الحساب",
    selected_count_label: "المحدد:",
    min_one_country_warning: "قاعدة النظام: يجب الإبقاء على دولة واحدة على الأقل.",

    // Form Sections & Fields
    sec_sponsor: "بيانات الكفيل",
    sec_worker: "بيانات العامل والتأشيرة",
    sec_financial: "البيانات المالية والرسوم",
    sec_scope: "الدولة والوكالة الخارجية",
    sec_notes: "الملاحظات الإدارية",
    form_edit_title: "تعديل المعاملة",
    form_new_title: "إضافة معاملة استقدام جديدة",
    form_added_by: "أضيفت بواسطة",
    form_last_updated: "آخر تعديل بواسطة",
    form_scope_title: "الدولة والوكالة المعتمدة",
    form_scope_admin_badge: "نطاق مخصص لمدير الدولة",
    form_select_country: "-- اختر الدولة --",
    form_select_agency: "-- اختر الوكالة --",
    form_country_label: "دولة الاستقدام *",
    form_agency_label: "الوكالة الخارجية المعتمدة *",
    form_sponsor_name: "اسم الكفيل *",
    form_sponsor_id: "رقم الهوية / الإقامة",
    form_phone: "رقم الجوال",
    form_city: "المدينة",
    form_worker_name: "اسم العامل / المرشح",
    form_passport_no: "رقم الجواز",
    form_visa_no: "رقم التأشيرة",
    form_musaned_no: "رقم عقد مساند",
    form_visa_status: "مرحلة التأشيرة",
    form_medical: "الفحص الطبي",
    form_airport: "مطار الوصول",
    form_reserved: "الحجز / موعد الرحلة",
    form_financial_title: "البيانات المالية",
    form_financial_locked: "مقفل — السجلات المسددة لا تُعدل إلا بصلاحية مدير",
    form_payment_state: "حالة السداد",
    form_amount: "المبلغ",
    form_currency: "العملة",
    form_tx_date: "تاريخ المعاملة",
    form_proc_date: "تاريخ البدء",
    form_notes: "الملاحظات الإدارية",
    form_submit_save: "حفظ التعديلات",
    form_submit_create: "إضافة المعاملة",
    form_cancel: "إلغاء",
    form_success_update: "تم تحديث المعاملة بنجاح",
    form_success_create: "تمت إضافة المعاملة بنجاح",

    // Auth Page
    auth_title_signin: "تسجيل الدخول",
    auth_title_signup: "إنشاء حساب جديد",
    auth_subtitle_signin: "أدخل بيانات حسابك أو اختر أحد حسابات التجربة أدناه للبدء فوراً.",
    auth_subtitle_signup: "الحسابات الجديدة تنضم بصلاحية موظف. أول حساب يصبح مديراً عاماً.",
    auth_demo_box: "حسابات التجربة والتطوير",
    auth_demo_click: "تسجيل دخول بنقرة واحدة",
    auth_email: "البريد الإلكتروني",
    auth_password: "كلمة المرور",
    auth_full_name: "الاسم الكامل",
    auth_sign_in_btn: "تسجيل الدخول",
    auth_sign_up_btn: "إنشاء الحساب",
    auth_switch_to_up: "ليس لديك حساب؟ إنشاء حساب جديد",
    auth_switch_to_in: "لديك حساب بالفعل؟ تسجيل الدخول",
    auth_platform_title: "منصة إدارة العمليات والتأشيرات الموحدة",
    auth_platform_desc:
      "تتبع فوري لمعاملات الكفلاء، تأشيرات العمالة، إجراءات السفارة، وتدقيق المدفوعات مع صلاحيات دقيقة وسجل تدقيق رقمي متكامل.",
    auth_bullet_1: "متابعة تفصيلية لحالات التفويض والسفارة وتأشيرة الدخول ومواعيد السفر",
    auth_bullet_2: "فصل الصلاحيات بين الإدارة وفريق العمل لحماية الحسابات المالية المقفلة",
    auth_bullet_3: "تصدير فوري لكشوفات وسندات المعاملات وسجلات التقارير الرسمية",
    auth_secure_badge: "نظام آمن — مخصص للاستخدام الداخلي فقط",
    auth_switch_lang_hint: "Switch to English",
    auth_welcome_back: "مرحباً بعودتك!",
    auth_acc_created: "تم إنشاء الحساب بنجاح!",
    auth_invalid_input: "البيانات المدخلة غير صحيحة",

    // Switch Language Button Label
    lang_switch_label: "English",
  },

  en: {
    // Brand & Header
    company_name: "Fan AlFaisal Recruitment Company",
    company_subtitle: "Integrated Visa & Workforce Management Platform",
    app_desk: "Operations & Visa Desk",
    tagline: "Integrated Visa, Candidate, Sponsor, and Payment Operations System",

    // Navigation
    nav_executive: "Executive Dashboard",
    nav_records: "Records & Visas",
    nav_hierarchy: "Countries & Agencies",
    nav_admins: "Team & Admins",
    nav_audit: "Audit Trail",
    nav_sign_out: "Sign out",

    // Executive Dashboard (Super Admin)
    exec_title: "Executive Leadership Dashboard",
    exec_subtitle:
      "Real-time strategic tracking of admin workloads, territory pipelines, and agency performance",
    exec_badge: "Super Admin",
    exec_read_only_notice:
      "Super Admin has global read-only visibility over candidate data. Record editing is reserved for assigned country Admins.",
    exec_tab_overview: "System Breakdown",
    exec_tab_admins: "Admin Workloads",
    exec_tab_countries: "Country Pipelines",
    exec_tab_agencies: "Agency Drill-Down",
    exec_active_records: "Active Records",
    exec_completed_visas: "Completed Visas",
    exec_canceled_apps: "Canceled Applications",
    exec_paid_total: "Total Paid Amount",
    exec_unpaid_total: "Unpaid / Pending Amount",
    exec_total_volume: "Total Financial Volume",
    exec_completion_rate: "Completion Rate",
    exec_active_rate: "Active Pipeline Rate",
    exec_admins_metrics_title: "Admins & Assigned Workloads",
    exec_admins_metrics_desc:
      "Distribution of appointed admins, their assigned countries, candidate volumes, and pending workloads",
    exec_assigned_territories: "Assigned Territories",
    exec_assigned_agencies: "Assigned Agencies",
    exec_handled_volume: "Total Candidate Volume",
    exec_pending_workload: "Active Pending Workload",
    exec_territory_finance: "Territory Financials",
    exec_country_pipeline_title: "Country-Level Pipelines",
    exec_country_pipeline_desc:
      "Processing metrics, financial distribution, and visa statuses per country",
    exec_agency_drilldown_title: "Agency Visa Processing Breakdown",
    exec_agency_drilldown_desc:
      "Exact counts and percentage distribution across the 5 core visa statuses for every agency",
    exec_status_stamped: "Visa Stamped",
    exec_status_trib: "TRIB (Completed)",
    exec_status_paid: "Wekala Paid",
    exec_status_unpaid: "Wekala Not Paid",
    exec_status_canceled: "Canceled",
    exec_all_countries: "All Countries",
    exec_search_agency: "Search agency name or country code...",
    exec_search_admin: "Search admin name or email...",
    exec_no_admins_found: "No matching admins found",
    exec_no_agencies_found: "No matching agencies found",
    exec_export_executive: "Export Executive Report",
    exec_refresh: "Refresh Real-Time Data",
    exec_agency_count: "Agencies Count",
    exec_applications_count: "Applications",
    exec_percentage_label: "Percentage",
    exec_count_label: "Count",
    exec_heavy_workload: "High Workload",
    exec_normal_workload: "Stable Workload",
    exec_view_records_for_country: "View Records for this Country",

    // Roles & Scope
    role_super_admin: "Super Admin",
    role_admin: "Country Admin",
    role_staff: "Operations Staff",
    role_read_only: "Read-Only Access",
    scope_global: "Global Access (All Territories)",
    scope_territory: "Scoped Territory",
    assigned_countries_label: "Assigned Countries",
    no_country_assigned_warning: "Warning: No country assigned",

    // Actions & Common
    new_record: "New Record",
    new_country: "Add Country",
    new_agency: "Add Agency",
    new_admin: "New Admin",
    assign_countries: "Assign Countries",
    edit: "Edit",
    delete: "Delete",
    save: "Save Changes",
    cancel: "Cancel",
    saving: "Saving…",
    search_placeholder: "Search sponsor, ID, passport, visa, phone…",
    clear_filters: "Clear Filters",
    export_csv: "Export CSV",
    export_excel: "Export Excel",
    export_pdf: "Print Report",
    print_slip: "Print Case Slip",
    view_details: "Inspect Details",
    actions: "Actions",
    loading: "Loading…",
    no_records: "No records match your filters",
    total: "Total",
    records_count: "records",
    showing: "Showing",
    to: "to",
    of: "of",
    rows_per_page: "Rows per page:",
    all: "All",
    system_user: "System",
    no_payload: "No payload details",

    // Tabs
    tab_grid: "Records Grid",
    tab_analytics: "Analytics & Reports",
    tab_overview: "Case Details",
    tab_history: "Audit History",

    // Quick Filters & Status Rules (Pure English, no mixed Arabic)
    qf_all: "All Records",
    qf_overdue: "Overdue (>30d)",
    qf_embassy: "In Embassy",
    qf_arrived: "Arrived",
    qf_visa_stamped: "Visa Stamped",
    qf_trib: "TRIB Completed",
    qf_wekala_paid: "Wekala Paid",
    qf_wekala_unpaid: "Wekala Not Paid",
    qf_canceled: "Canceled",

    // Table Columns
    col_serial: "#",
    col_sponsor_name: "Sponsor Name",
    col_sponsor_id: "Saudi ID / Iqama",
    col_worker_name: "Worker Name",
    col_passport: "Passport Number",
    col_visa_no: "Visa Number",
    col_musaned_no: "Musaned No.",
    col_city: "City",
    col_country: "Country",
    col_agency: "Agency",
    col_medical: "Medical Status",
    col_payment: "Payment Status",
    col_visa_status: "Processing Stage",
    col_amount: "Amount",
    col_date: "Date",
    col_days: "Days",
    col_notes: "Remarks",
    collapse_sidebar: "Collapse Sidebar",
    expand_sidebar: "Expand Sidebar",
    copy_to_clipboard: "Copy to Clipboard",
    copied_to_clipboard: "Copied to clipboard successfully",

    // Payment States (Pure English)
    pay_PAID: "Paid",
    pay_PENDING: "Pending",
    pay_PARTIAL: "Partial Payment",
    pay_UNPAID: "Unpaid",
    pay_REFUNDED: "Refunded",
    all_payments: "All Payment States",

    // Visa Statuses (Pure English)
    visa_WKALA: "Wekala Issued",
    visa_EMBASSY: "In Embassy",
    visa_VISA_STAMP: "Visa Stamped",
    visa_TRIB: "TRIB Completed",
    visa_BIOMETRIC: "Biometrics Done",
    visa_ARRIVED: "Arrived in Saudi Arabia",
    visa_CANCELLED: "Canceled",
    visa_CANCELED: "Canceled",
    all_visas: "All Visa Stages",

    // Medical States (Pure English)
    med_FIT: "Fit",
    med_UNFIT: "Unfit",
    med_PENDING: "Pending Medical",
    all_medicals: "All Medical States",

    // KPIs & Metrics Strip (5 Status Color Rules + Total)
    kpi_total: "Total Cases",
    kpi_paid: "Paid / Succeeded",
    kpi_embassy: "In Embassy",
    kpi_training: "In Training",
    kpi_pending_pay: "Pending Payment",
    kpi_overdue: "Overdue Cases",
    kpi_contract_val: "Contract Value",
    kpi_settled_paid: "Settled / Paid",
    kpi_collected: "Collected",
    kpi_outstanding: "Outstanding",
    kpi_embassy_stamped: "In Embassy / Stamped",
    kpi_fit_medical: "Fit Medical",
    kpi_trib_arrived: "Trib & Arrived",
    kpi_flight_ready: "Flight Ready",
    kpi_booked: "Booked",
    kpi_wekala_paid: "Wekala Paid",
    kpi_wekala_unpaid: "Wekala Not Paid",
    kpi_visa_stamped: "Visa Stamped",
    kpi_trib: "TRIB Completed",
    kpi_canceled: "Canceled Cases",

    // Dropdown filters
    all_cities: "All Cities",
    all_countries: "All Countries",
    all_agencies: "All Agencies",
    quick_views: "Quick Views:",
    density_comfortable: "Comfortable View",
    density_compact: "Compact View",
    total_filtered: "Total Filtered:",
    currency_sar: "SAR",
    edit_record: "Edit Record",
    inspect_case: "Inspect Case",
    delete_confirm: "Are you sure you want to delete record #",
    record_deleted: "Record deleted successfully",

    // Deletion Modal Safety
    confirm_delete_title: "Confirm Deletion",
    confirm_delete_desc:
      "Are you sure you want to permanently delete this record? This action cannot be undone.",
    confirm_delete_btn: "Confirm Delete",
    confirm_delete_cancel: "Cancel",

    // Export Confirmation & Feedback
    confirm_export_title: "Confirm File Download",
    confirm_export_desc: "Are you sure you want to export the current view to",
    confirm_download_btn: "Confirm Download",
    export_scope_label: "Export Records Scope",
    format_csv: "CSV Data File",
    format_excel: "Excel Spreadsheet",
    format_pdf: "PDF Document",
    export_preparing: "Preparing your export file...",
    export_ready: "Export file downloaded successfully",

    // Analytics View
    analytics_contract_val: "Total Contract Value",
    analytics_settled: "Settled / Collected",
    analytics_pending: "Pending Receivables",
    analytics_collection_rate: "Collection Rate",
    analytics_medical_clearance: "Medical Clearance",
    analytics_visa_dist: "Visa Pipeline Distribution",
    analytics_visa_dist_sub: "Active cases per processing stage",
    analytics_payment_dist: "Payment Status Breakdown",
    analytics_payment_dist_sub: "Proportion of settled vs pending cases",
    analytics_top_cities: "Top Destination Cities",
    analytics_top_cities_sub: "Cases grouped by Saudi city",
    analytics_operational_health: "Operational Health & Velocity",
    analytics_operational_health_sub: "Key bottlenecks and turnaround time",
    analytics_overdue_alert: "Cases Processing > 30 Days",
    analytics_unfit_alert: "Unfit Medicals Requiring Action",
    analytics_ticketed_alert: "Flight Ready / Ticketed",
    active_case_records: "active case records",
    outstanding_records: "outstanding records",
    city_unspecified: "Unspecified",

    // Detail & Inspection
    sec_travel: "Travel & Logistics",
    airport: "Arrival Airport",
    reserved_flight: "Reserved Flight",
    processing_date: "Processing Date",
    created_at_label: "Created",
    created_by_label: "By",
    updated_by_label: "Updated by",
    days_elapsed: "Days Elapsed",
    days_unit: "days",
    copied: "Copied",
    copy_label: "Copy",
    case_slip_title: "Visa Case Operations Slip",
    no_worker_specified: "No worker specified",
    musaned_contract_no: "Musaned Contract #",

    // Audit Trail
    audit_title: "Audit Trail",
    audit_subtitle: "Digital audit record of creations, modifications and status transitions.",
    audit_system_logs: "System Logs",
    audit_showing_events: "recorded events",
    audit_all_actions: "All Actions",
    audit_insert: "Creation",
    audit_update: "Modification",
    audit_delete: "Deletion",
    audit_search_placeholder: "Search by actor, record #, or changed field…",
    audit_timestamp: "Timestamp",
    audit_actor: "Actor",
    audit_action: "Action Type",
    audit_record_no: "Record #",
    audit_changes: "Changes / Payload Details",
    audit_no_logs: "No audit log entries found matching criteria",
    audit_loading: "Loading audit history…",
    audit_history_count: "Audit History",

    // Countries & Hierarchy
    hierarchy_title: "Hierarchy: Countries & Agencies",
    hierarchy_subtitle:
      "Manage recruitment countries and assigned overseas agencies. Each country has at least 1 agency.",
    countries_count: "Countries",
    agencies_count: "Agencies",
    initial_agency_required: "Initial Country Agency (Required)",
    license_no: "License No.",
    phone: "Phone Number",
    email: "Email Address",
    rule_country_agency: "System Rule: Every country must have at least 1 agency assigned",
    country_dialog_title: "Add New Country",
    country_dialog_desc: "Add a new recruitment country with its first accredited overseas agency.",
    agency_dialog_title: "Add New Agency",
    agency_dialog_desc: "Add a new accredited overseas agency for the selected country.",
    country_name_label: "Country Name",
    country_code_label: "Country Code",
    agency_name_label: "Overseas Agency Name",
    agency_license_label: "License Number",
    agency_phone_label: "Phone Number",
    agency_email_label: "Email Address",
    confirm_delete_country: "Are you sure you want to delete this country and all its agencies?",
    confirm_delete_agency: "Are you sure you want to delete this agency?",
    country_agency_rule_err:
      "System Rule: Cannot delete this agency. Every country must have at least 1 agency assigned.",
    fill_required_err: "Please fill in all required fields",
    country_created_success: "Country and agency created successfully!",
    agency_created_success: "Agency created successfully!",
    country_deleted_success: "Country deleted successfully",
    agency_deleted_success: "Agency deleted successfully",
    multi_tenant_badge: "Multi-Tenant Isolated",
    access_restricted_countries_desc:
      "Managing countries and recruitment agencies is restricted to Super Admin accounts.",
    country_code_title: "Country Code:",
    delete_country_tooltip: "Delete Country",
    delete_agency_tooltip: "Delete Agency",
    linked_agencies_label: "Linked Accredited Agencies:",
    country_status_active: "Active",

    // Admins & Roles
    admins_title: "Team & Role Access Controls",
    admins_subtitle:
      "Manage territory admins, multi-country assignments, and multi-tenant isolation.",
    access_restricted: "Access Restricted: This view is reserved for Super Admin only",
    access_restricted_users_desc:
      "Managing user accounts and country permissions is restricted to Super Admin accounts.",
    rule_admin_country: "System Rule: Every Admin must be assigned to at least 1 country",
    user_created_success: "Account created successfully",
    assignment_updated_success: "Country assignment updated successfully",
    user_dialog_title: "Add New Admin / Staff",
    user_dialog_desc:
      "Create a new user account, select their role, and assign authorized countries.",
    edit_territory_title: "Edit Country Assignment",
    edit_territory_desc: "Modify assigned countries and operational scope for this Admin.",
    user_role_label: "Role & Permissions",
    user_password_label: "Password",
    select_countries_prompt: "Select assigned countries (at least 1 required for Admin):",
    cannot_delete_self: "You cannot delete your own account.",
    confirm_delete_user: "Are you sure you want to delete this account?",
    admin_requires_country: "System Rule: Every Admin must be assigned to at least 1 country.",
    user_deleted_success: "Account deleted successfully",
    admin_scope_count: "assigned countries",
    super_admins_count: "Super Admins:",
    admins_count: "Territory Admins:",
    staff_count: "Staff Users:",
    role_card_super_title: "1. Super Admin",
    role_card_super_desc:
      "Full system-wide management across all territories, agencies, candidate records, accounts, and role assignments.",
    role_card_admin_title: "2. Territory Admin",
    role_card_admin_desc:
      "Complete territory isolation: sees and manages records only within their assigned countries and accredited agencies.",
    role_card_staff_title: "3. Operations Staff",
    role_card_staff_desc:
      "Global read-only visibility across all records and territories without create, edit, or delete permissions.",
    users_search_placeholder: "Search by name, email, or role…",
    users_loading: "Loading administrators…",
    badge_your_account: "Your Account",
    scope_all_full: "All Countries & Agencies (Full Global Access)",
    scope_all_readonly: "All Countries & Agencies (Read-Only Access)",
    scope_warning_no_country: "Warning: No territory assigned",
    col_user_email: "User / Email Address",
    col_role: "Role",
    col_assigned_countries: "Assigned Territories",
    col_admin_actions: "Administrative Actions",
    delete_user_btn: "Delete",
    selected_count_label: "Selected:",
    min_one_country_warning: "System rule: An Admin must retain at least one assigned country.",

    // Form Sections & Fields
    sec_sponsor: "Sponsor Details",
    sec_worker: "Worker & Visa Details",
    sec_financial: "Financial Information",
    sec_scope: "Territory & Overseas Agency",
    sec_notes: "Administrative Remarks",
    form_edit_title: "Edit Record",
    form_new_title: "Add New Candidate Record",
    form_added_by: "Added by",
    form_last_updated: "Last updated by",
    form_scope_title: "Territory & Accredited Agency",
    form_scope_admin_badge: "Assigned Territory",
    form_select_country: "-- Select Country --",
    form_select_agency: "-- Select Agency --",
    form_country_label: "Recruitment Country *",
    form_agency_label: "Accredited Overseas Agency *",
    form_sponsor_name: "Sponsor Name *",
    form_sponsor_id: "Saudi ID / Iqama",
    form_phone: "Phone Number",
    form_city: "City",
    form_worker_name: "Worker / Candidate Name",
    form_passport_no: "Passport Number",
    form_visa_no: "Visa Number",
    form_musaned_no: "Musaned Contract #",
    form_visa_status: "Processing Stage",
    form_medical: "Medical Examination",
    form_airport: "Arrival Airport",
    form_reserved: "Flight Booking Details",
    form_financial_title: "Financial Details",
    form_financial_locked: "Locked — Settled records can only be modified by Admins",
    form_payment_state: "Payment Status",
    form_amount: "Amount",
    form_currency: "Currency",
    form_tx_date: "Transaction Date",
    form_proc_date: "Processing Date",
    form_notes: "Administrative Remarks",
    form_submit_save: "Save Changes",
    form_submit_create: "Create Record",
    form_cancel: "Cancel",
    form_success_update: "Record updated successfully",
    form_success_create: "Record created successfully",

    // Auth Page
    auth_title_signin: "Sign In",
    auth_title_signup: "Create Account",
    auth_subtitle_signin:
      "Enter your credentials or choose a demo account below to get started immediately.",
    auth_subtitle_signup:
      "New accounts join with Staff permissions. The initial account becomes Super Admin.",
    auth_demo_box: "Demo & Testing Accounts",
    auth_demo_click: "1-Click Login",
    auth_email: "Email Address",
    auth_password: "Password",
    auth_full_name: "Full Name",
    auth_sign_in_btn: "Sign In",
    auth_sign_up_btn: "Create Account",
    auth_switch_to_up: "Don't have an account? Sign up",
    auth_switch_to_in: "Already have an account? Sign in",
    auth_platform_title: "Unified Operations & Visa Management Platform",
    auth_platform_desc:
      "Real-time tracking for sponsor records, candidate visas, embassy clearance, and payment auditing with multi-tenant permissions and comprehensive audit logs.",
    auth_bullet_1:
      "Detailed tracking for Wekala authorization, embassy stamping, visa issues, and flight schedules",
    auth_bullet_2: "Role-based isolation protecting financial records and territory-specific data",
    auth_bullet_3: "Instant export for Excel spreadsheets, case slips, and official PDF documents",
    auth_secure_badge: "Secure System — Internal Authorized Access Only",
    auth_switch_lang_hint: "التحويل للغة العربية",
    auth_welcome_back: "Welcome back!",
    auth_acc_created: "Account created successfully!",
    auth_invalid_input: "Invalid input entered",

    // Switch Language Button Label
    lang_switch_label: "العربية",
  },
};

export const DICTIONARY = translations;

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  dir: "rtl",
  isAr: true,
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, defaultVal?: string) => defaultVal ?? key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "ar";
  });

  const dir: Direction = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
      if (lang === "ar") {
        document.body.classList.add("font-arabic");
      } else {
        document.body.classList.remove("font-arabic");
      }
    }
  }, [lang, dir]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((curr) => {
      const next = curr === "ar" ? "en" : "ar";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, defaultVal?: string): string => {
      const dict = translations[lang] as Record<string, string>;
      if (dict && dict[key]) {
        return dict[key];
      }
      const fallbackDict = translations.ar as Record<string, string>;
      if (fallbackDict && fallbackDict[key]) {
        return fallbackDict[key];
      }
      return defaultVal ?? key;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      dir,
      isAr,
      setLang,
      toggleLang,
      t,
    }),
    [lang, dir, isAr, setLang, toggleLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
