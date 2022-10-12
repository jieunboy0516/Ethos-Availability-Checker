var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "jquery", "component", "knockout", "moment", "Areas/Widgets/Script/common/booking", "Areas/Widgets/Script/common/basket", "Areas/Widgets/Script/common/models/BasketItem", "Areas/Widgets/Script/common/services/CookieService", "Validation/BookingMetadataKeys", "Validation/EnrolmentMetadataKeys", "Areas/Widgets/Script/common/services/BasketService", "Areas/Widgets/Script/common/services/BasketAdditionalService", "Areas/Widgets/Script/common/services/FreeOfChargeOneClickService", "Areas/Widgets/Script/common/services/SiteTimetablesService", "Areas/Widgets/Script/common/FilterItem", "Areas/Widgets/Script/common/FilterGroup", "Areas/Widgets/Script/common/services/TermsAndConditionsService", "Areas/Widgets/Script/common/services/DocumentService", "Areas/Widgets/Script/termsandconditions/TermsAndConditionsItem", "Validation/BookingFilterKeys", "Scripts/LhUtilities/UrlHelpers", "Areas/Widgets/Script/common/TimeOfDay", "../common/models/PersonDocument", "Areas/Widgets/Script/common/filterEnums", "../common/services/UserPersonService", "../common/services/ConfigurationService", "../../../../Validation/TicketedActivityMetadataKeys", "../common/services/MemberService", "text!./bookingListTemplate.html", "native-promise-only"], function (require, exports, $, component, ko, moment, booking, Basket, BasketItem, CookieService, BookingMetadataKeys, EnrolmentMetadataKeys, BasketService, BasketAdditionalService, Foc1ClickService, SiteTimetablesService, FilterItem, FilterGroup, TermsAndConditionsService, DocumentService, TermsAndConditionsItem, BookingFilterKeys, UrlHelpers, TimeOfDay, PersonDocument, filterEnums_1, UserPersonService, ConfigurationService, TicketedActivityMetadataKeys, MemberService) {
    "use strict";
    // Create a custom binding handler so we can tell knockout we do not want to bind to part of the template.
    // We do this so we can bind a virtual model later on to view html assets.
    // See function viewHtml
    ko.bindingHandlers.stopBinding = {
        init: function () {
            return { controlsDescendantBindings: true };
        }
    };
    ko.bindingHandlers.element = {
        init: function (element, valueAccessor) {
            var target = valueAccessor();
            target(element);
        }
    };
    if (!ko.components.isRegistered('xn-card-component')) {
        ko.components.register('xn-card-component', {
            require: 'Areas/Widgets/Script/card/cardViewModel'
        });
    }
    if (!ko.components.isRegistered('xn-day-selector')) {
        ko.components.register('xn-day-selector', {
            viewModel: { require: 'Areas/Widgets/Script/timetable/daySelectorViewModel' },
            template: { require: 'text!Areas/Widgets/Script/timetable/daySelectorTemplate.html' }
        });
    }
    if (!ko.components.isRegistered('xn-calendar-popup')) {
        ko.components.register('xn-calendar-popup', {
            viewModel: { require: 'Areas/Widgets/Script/timetable/calendarPopupViewModel' },
            template: { require: 'text!Areas/Widgets/Script/timetable/calendarPopupTemplate.html' }
        });
    }
    if (!ko.components.isRegistered('xn-notification-component')) {
        ko.components.register('xn-notification-component', {
            require: 'Areas/Widgets/Script/notification/notificationViewModel'
        });
    }
    var BookingListViewModel = /** @class */ (function (_super) {
        __extends(BookingListViewModel, _super);
        function BookingListViewModel(params, basketAdditionalService, userPersonService, memberService) {
            var _this = _super.call(this) || this;
            _this.bookings = ko.observableArray([]);
            _this.sessions = ko.observableArray([]);
            _this.activities = ko.observableArray([]);
            _this.ticketedActivities = ko.observableArray([]);
            _this.ticketDescription = ko.observable();
            _this.ticketDateTime = ko.observable();
            _this.ticketName = ko.observable();
            _this.isAddingTicketToBasket = ko.observable(false);
            _this.anyVisibleBooking = ko.computed(function () { return _this.bookings().some(function (i) { return i.visible(); }); });
            _this.bookingsOrderArray = [
                { text: 'Type (A-Z)', field: 'eventType' },
                { text: 'Type (Z-A)', field: 'eventType', desc: true },
                { text: 'Name (A-Z)', field: 'activityDescription' },
                { text: 'Name (Z-A)', field: 'activityDescription', desc: true },
                { text: 'Time (Early-Late)', field: 'hourDecimal' },
                { text: 'Time (Late-Early)', field: 'hourDecimal', desc: true },
                { text: 'Cost (Low-High)', field: 'price' },
                { text: 'Cost (High-Low)', field: 'price', desc: true }
            ];
            _this.selectedOrder = ko.observable(_this.bookingsOrderArray[4]);
            _this.basket = new Basket();
            _this.userIsAuthenticated = ko.observable(false);
            _this.user = ko.observable(null);
            _this.noBookingsText = 'There are no bookings which match the selected criteria.';
            _this.loadingText = 'Loading bookings, please wait. <span class="xn-loading-icon"></span>';
            _this.errorText = 'An error occurred while retrieving the available bookings.  Please try again later.';
            _this.infoText = ko.observable('');
            _this.selectedDate = ko.observable(moment().startOf('day'));
            _this.startDate = ko.observable(_this.selectedDate().format('ll'));
            // This is just a random id used in the view to avoid collusion with anything else that might be on the page
            _this.referenceId = Math.random().toString(36).substring(2) + (new Date()).getTime().toString(36);
            _this.showBookNowConfirm = ko.observable(false);
            _this.showNotifyMeConfirmModal = ko.observable(false);
            _this.showPresentCrossSiteBasketsModal = ko.observable(false);
            _this.pendingBookingObs = ko.observable(null);
            _this.basketIsEmpty = ko.observable(false);
            _this.bookingService = new SiteTimetablesService();
            _this.basketService = new BasketService();
            _this.cookieService = new CookieService();
            _this.oneClickService = new Foc1ClickService();
            _this.tncService = new TermsAndConditionsService();
            _this.externalBookingSiteUrl = ko.observable('');
            _this.initialQueryString = window.location.search;
            _this.getBookingsLastCalled = new Date(1900, 1);
            _this.getBookingsLastPID = 0;
            _this.getBookingsLastSiteId = -1;
            _this.getBookingsLastYear = 1900;
            _this.getBookingsLastMonth = 1;
            _this.getBookingsLastDay = 1;
            _this.queryStringFiltersApplied = false;
            _this.termsAndConditions = ko.observable();
            _this.selectSublocationModalVisible = ko.observable(false);
            _this.selectSubLocationModalTitle = ko.observable();
            _this.viewTicketPricesModalVisible = ko.observable(false);
            _this.totalMaximumTickets = ko.observable(0);
            _this.dialogHasFocus = ko.observable(false);
            //Determines whether the 'confirm' button is enabled
            _this.bookNowEnabled = ko.pureComputed(function () {
                if (!_this.basketAdditionalService.isMinimumPersonDetailsForBookingCollected()) {
                    return false;
                }
                if (_this.termsAndConditions()) {
                    return _this.termsAndConditions().iAgree();
                }
                return true;
            }, _this);
            _this.emulateePersonPk = null;
            _this.linkedMembers = ko.observableArray([]);
            _this.allowPurchaseLinkedBookings = false;
            _this.isBookingLoading = false;
            _this.filteredMemberPk = 0;
            _this.bookingForName = ko.observable();
            _this.hasLinkedMembers = ko.observable(false);
            _this.checkIfBookingsNeedMoreInfo = function () {
                if (!_this.basketAdditionalService.isMinimumPersonDetailsForBookingCollected()) {
                    _this.messaging.publish("personDetailsForBooking.show");
                }
            };
            _this.loadTicketedActivitiesChange = function (loadTicketedActivities) {
                if (loadTicketedActivities) {
                    if (_this.ticketedActivities().length > 0) {
                        _this.ticketedActivities().forEach(function (i) {
                            _this.bookings.push(i);
                        });
                        _this.sortBookings(_this.selectedOrder());
                    }
                    else {
                        var tempHoldBookings_1 = _this.bookings();
                        var pid_1 = 0;
                        _this.messaging.getUserAndSubscribe('bookings', function (user) {
                            _this.userIsAuthenticated(!!user && user.IsAuthenticated);
                            _this.emulateePersonPk = (user.StaffPortalDimensionPersonPK != 0) ? user.StaffPortalDimensionPersonPK : null;
                            if (_this.userIsAuthenticated()) {
                                _this.user(user);
                                if (_this.filteredMemberPk == 0) {
                                    if (_this, _this.emulateePersonPk != null) {
                                        _this.getPersonDetails(_this.emulateePersonPk);
                                        pid_1 = _this.emulateePersonPk;
                                    }
                                    else {
                                        _this.getPersonDetails(user.DimensionPersonPk);
                                        pid_1 = user.DimensionPersonPk;
                                    }
                                }
                                else {
                                    _this.getPersonDetails(_this.filteredMemberPk);
                                    pid_1 = _this.filteredMemberPk;
                                }
                            }
                            _this.infoText(_this.loadingText);
                            _this.messaging.getSitesPromise().done(function (sites) {
                                var siteId = _this.messaging.getSiteId();
                                var externalBookingSite = sites.filter(function (i) { return i.Id == siteId && i.Links && i.Links.some(function (j) { return j.Rel === 'bookings'; }); }).pop();
                                _this.externalBookingSiteUrl(undefined);
                                if (externalBookingSite) {
                                    _this.externalBookingSiteUrl(externalBookingSite.Links.filter(function (i) { return i.Rel === 'bookings'; }).pop().Href);
                                    return;
                                }
                                //#region Don't call service if not a new call            
                                var now = new Date();
                                var msSinceLastCall = now - _this.getBookingsLastCalled;
                                var selectedYear = _this.selectedDate().year();
                                var selectedMonth = _this.selectedDate().month();
                                var selectedDayOfMonth = _this.selectedDate().date();
                                if ((msSinceLastCall < 500)
                                    && (siteId == _this.getBookingsLastSiteId)
                                    && (selectedYear == _this.getBookingsLastYear)
                                    && (selectedMonth == _this.getBookingsLastMonth)
                                    && (selectedDayOfMonth == _this.getBookingsLastDay)
                                    && (pid_1 == _this.getBookingsLastPID)) {
                                    return;
                                }
                                _this.bookings([]);
                                _this.getBookingsLastCalled = now;
                                _this.getBookingsLastSiteId = siteId;
                                _this.getBookingsLastYear = _this.selectedDate().year();
                                _this.getBookingsLastMonth = _this.selectedDate().month();
                                _this.getBookingsLastDay = _this.selectedDate().date();
                                _this.getBookingsLastPID = pid_1;
                                //#endregion
                                _this.bookingService.getTicketedActivities(siteId, _this.selectedDate().toDate(), pid_1)
                                    .done(function (bookings) {
                                    bookings.forEach(function (i) {
                                        //add results for the selected day into the observable array
                                        if (moment(i.StartTime).isSame(moment(_this.selectedDate()), "day")) {
                                            var bookingToAdd = new booking(i);
                                            _this.bookings.push(bookingToAdd);
                                            _this.ticketedActivities.push(bookingToAdd);
                                        }
                                    });
                                    tempHoldBookings_1.forEach(function (i) {
                                        _this.bookings.push(i);
                                    });
                                    _this.sortBookings(_this.selectedOrder());
                                    _this.generateFilters();
                                });
                            });
                        });
                    }
                }
                _this.sortBookings(_this.selectedOrder());
                _this.generateFilters();
                _this.bookings(_this.bookings().filter(function (b) { return b.visible() === true && b.bookingEnabled() && (b.bookableType === 0 || b.bookableType === 1) &&
                    moment.duration(moment(b.EndSales).diff(new Date())).asMinutes() > 0; }));
                _this.infoText(_this.noBookingsText);
            };
            _this.loadActivitiesChange = function (loadActivites) {
                if (loadActivites) {
                    if (_this.activities().length > 0) {
                        _this.activities().forEach(function (i) {
                            _this.bookings.push(i);
                        });
                        _this.sortBookings(_this.selectedOrder());
                    }
                    else {
                        var tempHoldBookings_2 = _this.bookings();
                        var pid_2 = 0;
                        _this.messaging.getUserAndSubscribe('bookings', function (user) {
                            _this.userIsAuthenticated(!!user && user.IsAuthenticated);
                            _this.emulateePersonPk = (user.StaffPortalDimensionPersonPK != 0) ? user.StaffPortalDimensionPersonPK : null;
                            if (_this.userIsAuthenticated()) {
                                _this.user(user);
                                if (_this.filteredMemberPk == 0) {
                                    if (_this.emulateePersonPk != null) {
                                        _this.getPersonDetails(_this.emulateePersonPk);
                                        pid_2 = _this.emulateePersonPk;
                                    }
                                    else {
                                        _this.getPersonDetails(user.DimensionPersonPk);
                                        pid_2 = user.DimensionPersonPk;
                                    }
                                }
                                else {
                                    _this.getPersonDetails(_this.filteredMemberPk);
                                    pid_2 = _this.filteredMemberPk;
                                }
                            }
                            _this.infoText(_this.loadingText);
                            _this.messaging.getSitesPromise().done(function (sites) {
                                var siteId = _this.messaging.getSiteId();
                                var externalBookingSite = sites.filter(function (i) { return i.Id == siteId && i.Links && i.Links.some(function (j) { return j.Rel === 'bookings'; }); }).pop();
                                _this.externalBookingSiteUrl(undefined);
                                if (externalBookingSite) {
                                    _this.externalBookingSiteUrl(externalBookingSite.Links.filter(function (i) { return i.Rel === 'bookings'; }).pop().Href);
                                    return;
                                }
                                //#region Don't call service if not a new call            
                                var now = new Date();
                                var msSinceLastCall = now - _this.getBookingsLastCalled;
                                var selectedYear = _this.selectedDate().year();
                                var selectedMonth = _this.selectedDate().month();
                                var selectedDayOfMonth = _this.selectedDate().date();
                                if ((msSinceLastCall < 500)
                                    && (siteId == _this.getBookingsLastSiteId)
                                    && (selectedYear == _this.getBookingsLastYear)
                                    && (selectedMonth == _this.getBookingsLastMonth)
                                    && (selectedDayOfMonth == _this.getBookingsLastDay)
                                    && (pid_2 == _this.getBookingsLastPID)) {
                                    return;
                                }
                                _this.bookings([]);
                                _this.getBookingsLastCalled = now;
                                _this.getBookingsLastSiteId = siteId;
                                _this.getBookingsLastYear = _this.selectedDate().year();
                                _this.getBookingsLastMonth = _this.selectedDate().month();
                                _this.getBookingsLastDay = _this.selectedDate().date();
                                _this.getBookingsLastPID = pid_2;
                                //#endregion
                                _this.bookingService.getBookingActivities(siteId, _this.selectedDate().toDate(), pid_2)
                                    .done(function (bookings) {
                                    bookings.forEach(function (i) {
                                        //add results for the selected day into the observable array
                                        if (moment(i.StartTime).isSame(moment(_this.selectedDate()), "day")) {
                                            var bookingToAdd = new booking(i);
                                            _this.bookings.push(bookingToAdd);
                                            _this.activities.push(bookingToAdd);
                                        }
                                    });
                                    tempHoldBookings_2.forEach(function (i) {
                                        _this.bookings.push(i);
                                    });
                                    _this.sortBookings(_this.selectedOrder());
                                    _this.generateFilters();
                                });
                            });
                        });
                    }
                }
                _this.sortBookings(_this.selectedOrder());
                _this.generateFilters();
                _this.bookings(_this.bookings().filter(function (b) { return b.visible() === true && b.bookingEnabled() && (b.bookableType === 0 || b.bookableType === 1) && moment.duration(moment(b.EndSales).diff(new Date())).asMinutes() > 0; }));
                _this.infoText(_this.noBookingsText);
            };
            _this.loadSessionCoursesChange = function (loadSessionCourses) {
                if (loadSessionCourses) {
                    if (_this.sessions().length > 0) {
                        _this.sessions().forEach(function (i) {
                            _this.bookings.push(i);
                        });
                        _this.sortBookings(_this.selectedOrder());
                    }
                    else {
                        var tempHoldBookings_3 = _this.bookings();
                        var pid_3 = 0;
                        _this.messaging.getUserAndSubscribe('bookings', function (user) {
                            _this.userIsAuthenticated(!!user && user.IsAuthenticated);
                            _this.emulateePersonPk = (user.StaffPortalDimensionPersonPK != 0) ? user.StaffPortalDimensionPersonPK : null;
                            if (_this.userIsAuthenticated()) {
                                _this.user(user);
                                if (_this.filteredMemberPk == 0) {
                                    if (_this.emulateePersonPk != null) {
                                        _this.getPersonDetails(_this.emulateePersonPk);
                                        pid_3 = _this.emulateePersonPk;
                                    }
                                    else {
                                        _this.getPersonDetails(user.DimensionPersonPk);
                                        pid_3 = user.DimensionPersonPk;
                                    }
                                }
                                else {
                                    _this.getPersonDetails(_this.filteredMemberPk);
                                    pid_3 = _this.filteredMemberPk;
                                }
                            }
                            _this.infoText(_this.loadingText);
                            _this.messaging.getSitesPromise().done(function (sites) {
                                var siteId = _this.messaging.getSiteId();
                                var externalBookingSite = sites.filter(function (i) { return i.Id == siteId && i.Links && i.Links.some(function (j) { return j.Rel === 'bookings'; }); }).pop();
                                _this.externalBookingSiteUrl(undefined);
                                if (externalBookingSite) {
                                    _this.externalBookingSiteUrl(externalBookingSite.Links.filter(function (i) { return i.Rel === 'bookings'; }).pop().Href);
                                    return;
                                }
                                //#region Don't call service if not a new call            
                                var now = new Date();
                                var msSinceLastCall = now - _this.getBookingsLastCalled;
                                var selectedYear = _this.selectedDate().year();
                                var selectedMonth = _this.selectedDate().month();
                                var selectedDayOfMonth = _this.selectedDate().date();
                                if ((msSinceLastCall < 500)
                                    && (siteId == _this.getBookingsLastSiteId)
                                    && (selectedYear == _this.getBookingsLastYear)
                                    && (selectedMonth == _this.getBookingsLastMonth)
                                    && (selectedDayOfMonth == _this.getBookingsLastDay)
                                    && (pid_3 == _this.getBookingsLastPID)) {
                                    return;
                                }
                                _this.bookings([]);
                                _this.getBookingsLastCalled = now;
                                _this.getBookingsLastSiteId = siteId;
                                _this.getBookingsLastYear = _this.selectedDate().year();
                                _this.getBookingsLastMonth = _this.selectedDate().month();
                                _this.getBookingsLastDay = _this.selectedDate().date();
                                _this.getBookingsLastPID = pid_3;
                                //#endregion
                                _this.bookingService.getSessionCourseActivities(siteId, _this.selectedDate().toDate(), pid_3)
                                    .done(function (bookings) {
                                    bookings.forEach(function (i) {
                                        //add results for the selected day into the observable array
                                        if (moment(i.StartTime).isSame(moment(_this.selectedDate()), "day")) {
                                            var bookingToAdd = new booking(i);
                                            _this.bookings.push(bookingToAdd);
                                            _this.sessions.push(bookingToAdd);
                                        }
                                    });
                                    tempHoldBookings_3.forEach(function (i) {
                                        _this.bookings.push(i);
                                    });
                                    _this.sortBookings(_this.selectedOrder());
                                    _this.generateFilters();
                                });
                            });
                        });
                    }
                }
                _this.sortBookings(_this.selectedOrder());
                _this.generateFilters();
                _this.bookings(_this.bookings().filter(function (b) { return b.visible() === true && b.bookingEnabled() && (b.bookableType === 0 || b.bookableType === 1) && moment.duration(moment(b.EndSales).diff(new Date())).asMinutes() > 0; }));
                _this.infoText(_this.noBookingsText);
            };
            _this.setDateFromQueryString = function () {
                var qParams = UrlHelpers.paramsFromQueryString(_this.initialQueryString);
                if (qParams[BookingFilterKeys.DateFilterGroupKey]) {
                    var startDateFromQueryString = moment(qParams[BookingFilterKeys.DateFilterGroupKey]).startOf('day');
                    _this.startDate(startDateFromQueryString.format('ll'));
                    _this.selectedDate(startDateFromQueryString);
                }
            };
            _this.setSiteFromQueryString = function () {
                var qParams = UrlHelpers.paramsFromQueryString(_this.initialQueryString);
                var siteIdFromQueryString = qParams[BookingFilterKeys.SiteFilterGroupKey];
                _this.messaging.setSiteId(siteIdFromQueryString, true);
            };
            _this.checkBasket = function () {
                var basketId = _this.cookieService.getBasketIdFromCookie();
                if (basketId) {
                    var basketService = _this.basketService.getBasketItemsByBasketId(basketId)
                        .done(function (i) { _this.basketIsEmpty(i.length === 0); })
                        .fail(function () {
                        _this.cookieService.deleteBasketIdCookie();
                        _this.basketIsEmpty(true);
                    });
                }
                else {
                    _this.basketIsEmpty(true);
                }
            };
            _this.getBookingsAndLoadFilter = function () {
                if (_this.dynamicFilters.bookingLoadFilter() == null) {
                    _this.bookingService.getDefaultBookingLoadFilter(_this.messaging.getSiteId()).done(function (filter) {
                        _this.dynamicFilters.bookingLoadFilter(filter);
                        _this.getBookings(0);
                    });
                }
                else {
                    _this.getBookings(0);
                }
            };
            _this.getBookings = function (linkId) {
                _this.isBookingLoading = true;
                var qParams = UrlHelpers.paramsFromQueryString(window.location.search);
                if (BookingFilterKeys.TypeFilterGroupKey in qParams) {
                    var selectedCodes = qParams[BookingFilterKeys.TypeFilterGroupKey];
                    var selectedCodesArray = selectedCodes.split(",");
                    var NewBookingLoadFilter = _this.dynamicFilters.bookingLoadFilter();
                    if (selectedCodesArray.indexOf("0") > -1 && NewBookingLoadFilter.Activities != true) {
                        NewBookingLoadFilter.Activities = true;
                    }
                    if ((selectedCodesArray.indexOf("1") > -1 || selectedCodesArray.indexOf("2") > -1) && NewBookingLoadFilter.Sessions != true) {
                        NewBookingLoadFilter.Sessions = true;
                    }
                    if (selectedCodesArray.indexOf("4") > -1) {
                        NewBookingLoadFilter.TicketedActivities = true;
                    }
                    _this.dynamicFilters.bookingLoadFilter(NewBookingLoadFilter);
                }
                var pid = 0;
                //Determine who we want to get available bookings for
                _this.messaging.getUserAndSubscribe('bookings', function (user) {
                    _this.userIsAuthenticated(!!user && user.IsAuthenticated);
                    _this.emulateePersonPk = (user.StaffPortalDimensionPersonPK != 0) ? user.StaffPortalDimensionPersonPK : null;
                    if (_this.userIsAuthenticated()) {
                        _this.user(user);
                        if (_this.filteredMemberPk == 0) {
                            if (_this.emulateePersonPk != null) {
                                _this.getPersonDetails(_this.emulateePersonPk);
                                pid = _this.emulateePersonPk;
                            }
                            else {
                                _this.getPersonDetails(user.DimensionPersonPk);
                                pid = user.DimensionPersonPk;
                            }
                        }
                        else {
                            _this.getPersonDetails(_this.filteredMemberPk);
                            pid = _this.filteredMemberPk;
                        }
                    }
                    _this.infoText(_this.loadingText);
                    _this.messaging.getSitesPromise().done(function (sites) {
                        var siteId = _this.messaging.getSiteId();
                        var externalBookingSite = sites.filter(function (i) { return i.Id == siteId && i.Links && i.Links.some(function (j) { return j.Rel === 'bookings'; }); }).pop();
                        _this.externalBookingSiteUrl(undefined);
                        if (externalBookingSite) {
                            _this.externalBookingSiteUrl(externalBookingSite.Links.filter(function (i) { return i.Rel === 'bookings'; }).pop().Href);
                            _this.isBookingLoading = false;
                            return;
                        }
                        //#region Don't call service if not a new call            
                        var now = new Date();
                        var msSinceLastCall = now - _this.getBookingsLastCalled;
                        var selectedYear = _this.selectedDate().year();
                        var selectedMonth = _this.selectedDate().month();
                        var selectedDayOfMonth = _this.selectedDate().date();
                        if ((msSinceLastCall < 500)
                            && (siteId == _this.getBookingsLastSiteId)
                            && (selectedYear == _this.getBookingsLastYear)
                            && (selectedMonth == _this.getBookingsLastMonth)
                            && (selectedDayOfMonth == _this.getBookingsLastDay)
                            && (pid == _this.getBookingsLastPID)) {
                            if (!_this.dynamicFilters.bookingLoadFilter().Activities && !_this.dynamicFilters.bookingLoadFilter().Sessions && !_this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                _this.bookings([]);
                                _this.sessions([]);
                                _this.activities([]);
                                _this.ticketedActivities([]);
                                _this.generateFilters();
                                _this.infoText(_this.noBookingsText);
                            }
                            _this.isBookingLoading = false;
                            return;
                        }
                        _this.bookings([]); // clear bookings after we are sure that a search will be started
                        _this.getBookingsLastCalled = now;
                        _this.getBookingsLastSiteId = siteId;
                        _this.getBookingsLastYear = _this.selectedDate().year();
                        _this.getBookingsLastMonth = _this.selectedDate().month();
                        _this.getBookingsLastDay = _this.selectedDate().date();
                        _this.getBookingsLastPID = pid;
                        //#endregion
                        if (!_this.dynamicFilters.bookingLoadFilter().Activities && !_this.dynamicFilters.bookingLoadFilter().Sessions && !_this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                            _this.bookings([]);
                            _this.sessions([]);
                            _this.activities([]);
                            _this.ticketedActivities([]);
                            _this.generateFilters();
                            _this.infoText(_this.noBookingsText);
                            _this.isBookingLoading = false;
                        }
                        else {
                            if (siteId != undefined && siteId != 0) {
                                if (_this.dynamicFilters.bookingLoadFilter().Activities && _this.dynamicFilters.bookingLoadFilter().Sessions && _this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //All Types
                                    _this.bookingsDeferred = _this.bookingService.getBookings(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.bookingService.getTicketedActivities(siteId, _this.selectedDate().toDate(), pid).done(function (ticketActs) {
                                            if (ticketActs.length > 0) {
                                                ticketActs.forEach(function (i) {
                                                    bookings.push(i);
                                                });
                                            }
                                            _this.loadBookingList(bookings);
                                        })
                                            .fail(function (error) {
                                            _this.infoText(_this.errorText);
                                            _this.isBookingLoading = false;
                                        });
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (_this.dynamicFilters.bookingLoadFilter().Activities && _this.dynamicFilters.bookingLoadFilter().Sessions && !_this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //Activities and sessions
                                    _this.bookingsDeferred = _this.bookingService.getBookings(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.loadBookingList(bookings);
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (_this.dynamicFilters.bookingLoadFilter().Activities && !_this.dynamicFilters.bookingLoadFilter().Sessions && !_this.dynamicFilters.bookingLoadFilter().TicketedActivities) { //Activities only
                                    _this.bookingsDeferred = _this.bookingService.getBookingActivities(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.loadBookingList(bookings);
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (_this.dynamicFilters.bookingLoadFilter().Activities && !_this.dynamicFilters.bookingLoadFilter().Sessions && _this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //Activities and ticketed activites
                                    _this.bookingsDeferred = _this.bookingService.getBookingActivities(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.bookingService.getTicketedActivities(siteId, _this.selectedDate().toDate(), pid).done(function (ticketActs) {
                                            if (ticketActs.length > 0) {
                                                ticketActs.forEach(function (i) {
                                                    bookings.push(i);
                                                });
                                            }
                                            _this.loadBookingList(bookings);
                                        })
                                            .fail(function (error) {
                                            _this.infoText(_this.errorText);
                                            _this.isBookingLoading = false;
                                        });
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (!_this.dynamicFilters.bookingLoadFilter().Activities && _this.dynamicFilters.bookingLoadFilter().Sessions && !_this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //sessions only
                                    _this.bookingsDeferred = _this.bookingService.getSessionCourseActivities(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.loadBookingList(bookings);
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (!_this.dynamicFilters.bookingLoadFilter().Activities && _this.dynamicFilters.bookingLoadFilter().Sessions && _this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //Sessions and ticketed activities
                                    _this.bookingsDeferred = _this.bookingService.getSessionCourseActivities(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.bookingService.getTicketedActivities(siteId, _this.selectedDate().toDate(), pid).done(function (ticketActs) {
                                            if (ticketActs.length > 0) {
                                                ticketActs.forEach(function (i) {
                                                    bookings.push(i);
                                                });
                                            }
                                            _this.loadBookingList(bookings);
                                        })
                                            .fail(function (error) {
                                            _this.infoText(_this.errorText);
                                            _this.isBookingLoading = false;
                                        });
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                                else if (!_this.dynamicFilters.bookingLoadFilter().Activities && !_this.dynamicFilters.bookingLoadFilter().Sessions && _this.dynamicFilters.bookingLoadFilter().TicketedActivities) {
                                    //ticketed activities only
                                    _this.bookingsDeferred = _this.bookingService.getTicketedActivities(siteId, _this.selectedDate().toDate(), pid).done(function (bookings) {
                                        _this.loadBookingList(bookings);
                                    })
                                        .fail(function (error) {
                                        _this.infoText(_this.errorText);
                                        _this.isBookingLoading = false;
                                    });
                                }
                            }
                            else {
                                console.error("Cannot retrieve bookings for an undefined or 0 SiteId.");
                            }
                        }
                    });
                });
            };
            _this.loadBookingList = function (bookings) {
                _this.bookings([]);
                _this.activities([]);
                _this.sessions([]);
                _this.ticketedActivities([]); // clear bookings
                bookings.forEach(function (i) {
                    //add results for the selected day into the observable array
                    if (moment(i.StartTime).isSame(moment(_this.selectedDate()), "day")) {
                        var bookingToAdd = new booking(i);
                        _this.bookings.push(bookingToAdd);
                        if (i.EventType == 0) {
                            _this.activities.push(bookingToAdd);
                        }
                        else if ((i.EventType == 1) || (i.EventType == 2)) {
                            _this.sessions.push(bookingToAdd);
                        }
                        else if (i.EventType == 4) {
                            _this.ticketedActivities.push(bookingToAdd);
                        }
                    }
                });
                _this.bookings(_this.bookings().filter(function (b) { return b.visible() === true; }));
                _this.sortBookings(_this.selectedOrder());
                _this.generateFilters();
                _this.infoText(_this.noBookingsText);
                /* Because we can't halt previously submitted async ajax calls to get bookings which may have been for other days,
                   limit the bookings collection to include only bookings for the currently specified date */
                _this.bookings(_this.bookings().filter(function (b) { return moment(b.startTime).isSame(moment(_this.selectedDate()), "day"); }));
                _this.isBookingLoading = false;
            };
            _this.generateFilters = function () {
                // Get the filter groups that have already been set up so we can add to the filters
                var filterGroups = _this.dynamicFilters.filterGroups();
                var primeId = 0;
                var self = _this;
                // For ease we'll set a variable referencing each group we're interested in.
                var textGroup = filterGroups.filter(function (fg) { return fg.key === "_bookingTextSearch"; }).pop(), locationGroup = filterGroups.filter(function (fg) { return fg.key === BookingFilterKeys.LocationsFilterGroupKey; }).pop(), availabilityGroup = filterGroups.filter(function (fg) { return fg.key === BookingFilterKeys.AvailabilityFilterGroupKey; }).pop(), timeGroup = filterGroups.filter(function (fg) { return fg.key === BookingFilterKeys.TimeFilterGroupKey; }).pop(), activityGroup = filterGroups.filter(function (fg) { return fg.key === BookingFilterKeys.ActivityFilterGroupKey; }).pop(), typeGroup = filterGroups.filter(function (fg) { return fg.key === BookingFilterKeys.TypeFilterGroupKey; }).pop();
                // Create the text search group if it does not already exist.
                if (filterGroups.filter(function (fg) { return fg.key === "_sch"; }).length === 0) {
                    textGroup = new FilterGroup({ name: 'Search', key: BookingFilterKeys.SearchFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-search-filter' });
                    var textGroupItem_1 = new FilterItem({
                        name: 'Search activities',
                        key: "_sch",
                        title: '',
                        searchText: '',
                        selected: undefined,
                        check: function (b) { return textGroupItem_1.searchText().toLowerCase().split(' ').filter(function (i) { return i; }).some(function (i) { return b.heading.toLowerCase().indexOf(i) > -1; }); },
                        order: undefined
                    });
                    //Overide the defualt FilterItem.selected observable with a computed observable calculating if the user has typed anything in the serach text box; 
                    textGroupItem_1.extend('selected', ko.computed(function () {
                        return !!this.searchText();
                    }, textGroupItem_1));
                    textGroup.items.push(textGroupItem_1);
                    // No need to add the text group to the filter group array here as we will add it to the begining of the array later.
                }
                // Create the event type group if it does not already exist.
                if (!typeGroup) {
                    typeGroup = new FilterGroup({ name: 'Type', key: BookingFilterKeys.TypeFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-type-filter' });
                    filterGroups.push(typeGroup);
                }
                // Create the activity group if it does not already exist.
                if (!activityGroup) {
                    activityGroup = new FilterGroup({ name: 'What do you want to do?', key: BookingFilterKeys.ActivityFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-activity-filter' });
                    filterGroups.push(activityGroup);
                }
                // Create the time group if it does not already exist.
                if (!timeGroup) {
                    timeGroup = new FilterGroup({ name: 'Time', key: BookingFilterKeys.TimeFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-time-filter' });
                    filterGroups.push(timeGroup);
                }
                // Create the locations groups if it does not already exist.
                if (!locationGroup) {
                    locationGroup = new FilterGroup({ name: 'Locations', key: BookingFilterKeys.LocationsFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-location-filter' });
                    filterGroups.push(locationGroup);
                }
                // Create the availability group if it does not already exist.
                if (!availabilityGroup) {
                    availabilityGroup = new FilterGroup({ name: 'Availability', key: BookingFilterKeys.AvailabilityFilterGroupKey, items: [], mutuallyExclusive: false, className: 'xn-availability-filter' });
                    filterGroups.push(availabilityGroup);
                }
                var _loop_1 = function (book) {
                    // If a booking has no available places add a filter to allow a user to filter them out if it does not already exist.
                    if (!book.availablePlaces() && !availabilityGroup.items().some(function (i) { return i.key === BookingFilterKeys.AvailabilityFilterAvailableItemKey; })) {
                        availabilityGroup.items.push(new FilterItem({
                            name: 'Not fully booked',
                            key: BookingFilterKeys.AvailabilityFilterAvailableItemKey,
                            title: '',
                            searchText: undefined,
                            selected: false,
                            check: function (b) { return b.availablePlaces() > 0; },
                            order: undefined
                        }));
                    }
                    // Add the Morning time filter if the booking falls within the pre-defined morning time span and the morning time filter does not already exist.
                    if (TimeOfDay.timeOfDay.Morning(book.hour) && !timeGroup.items().some(function (i) { return i.key === BookingFilterKeys.TimeFilterMorningItemKey; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return XN_timeOfDay.Morning(b.hour); }";
                        timeGroup.items().push(new FilterItem({
                            name: 'Morning',
                            key: BookingFilterKeys.TimeFilterMorningItemKey,
                            title: '4:00 am - 11:59 am',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: 1
                        }));
                    }
                    // Add the Midday time filter if the booking falls within the pre-defined midday time span and the midday time filter does not already exist.
                    if (TimeOfDay.timeOfDay.Midday(book.hour) && !timeGroup.items().some(function (i) { return i.key === BookingFilterKeys.TimeFilterMiddayItemKey; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return XN_timeOfDay.Midday(b.hour); }";
                        timeGroup.items().push(new FilterItem({
                            name: 'Afternoon',
                            key: BookingFilterKeys.TimeFilterMiddayItemKey,
                            title: '12:00 pm - 5:59 pm',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: 2,
                        }));
                    }
                    // Add the Evening time filter if the booking falls within the pre-defined evening time span and the evening time filter does not already exist.
                    if (TimeOfDay.timeOfDay.Evening(book.hour) && !timeGroup.items().some(function (i) { return i.key === BookingFilterKeys.TimeFilterEveningItemKey; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return XN_timeOfDay.Evening(b.hour); }";
                        timeGroup.items().push(new FilterItem({
                            name: 'Evening',
                            key: BookingFilterKeys.TimeFilterEveningItemKey,
                            title: '6:00 pm - 9:59 pm',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: 3
                        }));
                    }
                    // Add the Night time filter if the booking falls within the pre-defined night time span and the night time filter does not already exist.
                    if (TimeOfDay.timeOfDay.Night(book.hour) && !timeGroup.items().some(function (i) { return i.key === BookingFilterKeys.TimeFilterNightItemKey; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return XN_timeOfDay.Night(b.hour); }";
                        timeGroup.items().push(new FilterItem({
                            name: 'Night',
                            key: BookingFilterKeys.TimeFilterNightItemKey,
                            title: '10:00 pm - 3:59 am',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: 4,
                        }));
                    }
                    // Add this bookings location code if it does not already exist.
                    if (!locationGroup.items().some(function (i) { return i.key === book.locationCode; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return b.locationCode === '" + book.locationCode + "'; }";
                        locationGroup.items.push(new FilterItem({
                            name: book.locationDescription,
                            key: book.locationCode,
                            title: '',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: undefined
                        }));
                    }
                    // Add this bookings activity code if it does not already exist. 
                    if (!activityGroup.items().some(function (i) { return i.key === book.activityCode; })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Function command to generate a callable function.
                        var cFunc = "function (b) { return b.activityCode === '" + book.activityCode + "'; }";
                        activityGroup.items.push(new FilterItem({
                            name: book.heading,
                            key: book.activityCode,
                            title: '',
                            searchText: undefined,
                            selected: false,
                            // Create a physical function from the string built earlier.
                            check: new Function("return " + cFunc)(),
                            order: undefined
                        }).extend('imgCls', book.imageClass));
                    }
                    // Add this bookings event type to the group is it does not already exist.
                    if (!typeGroup.items().some(function (i) { return i.key === book.eventType.toString(); })) {
                        // We need to create functions using strings as we will later serialise them for saved searches.
                        // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                        var cFunc = "function (b) { return b.eventType === " + book.eventType + "; }";
                        if (book.eventType === 4) {
                            typeGroup.items.push(new FilterItem({
                                name: _this.eventTypeLookup[book.eventType],
                                key: book.eventType.toString(),
                                title: '',
                                searchText: undefined,
                                selected: _this.dynamicFilters.bookingLoadFilter().TicketedActivities,
                                // Create a physical function from the string built earlier.
                                check: new Function("return " + cFunc)(),
                                order: undefined
                            }));
                        }
                        else if (book.eventType === 1) {
                            typeGroup.items.push(new FilterItem({
                                name: _this.eventTypeLookup[book.eventType],
                                key: book.eventType.toString(),
                                title: '',
                                searchText: undefined,
                                selected: _this.dynamicFilters.bookingLoadFilter().Sessions,
                                // Create a physical function from the string built earlier.
                                check: new Function("return " + cFunc)(),
                                order: undefined
                            }));
                        }
                        else if (book.eventType === 0) {
                            typeGroup.items.push(new FilterItem({
                                name: _this.eventTypeLookup[book.eventType],
                                key: book.eventType.toString(),
                                title: '',
                                searchText: undefined,
                                selected: _this.dynamicFilters.bookingLoadFilter().Activities,
                                // Create a physical function from the string built earlier.
                                check: new Function("return " + cFunc)(),
                                order: undefined
                            }));
                        }
                        else {
                            typeGroup.items.push(new FilterItem({
                                name: _this.eventTypeLookup[book.eventType],
                                key: book.eventType.toString(),
                                title: '',
                                searchText: undefined,
                                selected: false,
                                // Create a physical function from the string built earlier.
                                check: new Function("return " + cFunc)(),
                                order: undefined
                            }));
                        }
                    }
                    var _loop_2 = function (tag) {
                        var tagGroup = filterGroups.filter(function (fg) { return fg.key === tag.groupId; }).pop();
                        if (!tagGroup) {
                            tagGroup = new FilterGroup({ name: tag.groupName, key: tag.groupId, items: [], mutuallyExclusive: false });
                            filterGroups.push(tagGroup);
                        }
                        if (!tagGroup.items().some(function (i) { return i.key === tag.id; })) {
                            // We need to create functions using strings as we will later serialise them for saved searches.
                            // This needs to be in javascript rather than typescript so that we can use the Javascript Functiuon command to generate a callable function.
                            var cFunc = "function (b) { return b.tags.some(function(i) { return i.id === '" + tag.id + "' }); }";
                            tagGroup.items.push(new FilterItem({
                                name: tag.name,
                                key: tag.id,
                                title: '',
                                searchText: undefined,
                                selected: false,
                                // Create a physical function from the string built earlier.
                                check: new Function("return " + cFunc)(),
                                order: undefined
                            }));
                        }
                    };
                    // Add this bookings available tags if they do not already exist. 
                    for (var _i = 0, _a = book.tags; _i < _a.length; _i++) {
                        var tag = _a[_i];
                        _loop_2(tag);
                    }
                    // Create a computed observable that determines if this booking is visible given all selected filters.
                    book.visible = _this.dynamicFilters.itemVisible(book);
                };
                // For each booking add all relevant filters to each group if they do not exist.
                for (var _i = 0, _a = _this.bookings(); _i < _a.length; _i++) {
                    var book = _a[_i];
                    _loop_1(book);
                }
                if (_this.userIsAuthenticated() && ((_this.allowPurchaseLinkedBookings) || (_this.emulateePersonPk != null))) {
                    //Create filter options using the linked members and prime person
                    _this.getLinkedMembers().then(function (results) {
                        self.linkedMembers(results);
                    }).then(function () {
                        _this.getPrimePerson().then(function (result) {
                            if (self.linkedMembers().filter(function (lm) { return lm.PersonId == result.PersonId; }).length == 0) {
                                self.linkedMembers.push(result);
                            }
                            primeId = result.PersonId;
                        }).then(function () {
                            var linkedMembersGroup;
                            if (self.linkedMembers().length > 1) {
                                _this.hasLinkedMembers(true);
                                // Create the Linked Members filter group if it does not already exist
                                linkedMembersGroup = filterGroups.filter(function (fg) { return fg.key === "_linkedMembers"; }).pop();
                                if (!linkedMembersGroup) {
                                    linkedMembersGroup = new FilterGroup({ name: "Linked Members", key: "_linkedMembers", items: [], mutuallyExclusive: true, className: 'xn-linkedMembers-filter' });
                                    filterGroups.push(linkedMembersGroup);
                                }
                            }
                            else {
                                _this.dynamicFilters.filterGroups(filterGroups);
                                _this.finaliseFilters(textGroup, availabilityGroup);
                            }
                            _this.generateLinkedMemberFilters().then(function (results) {
                                if ((linkedMembersGroup) && (_this.linkedMembers().length > 1)) {
                                    results.forEach(function (fi) {
                                        if (fi.key == self.getBookingsLastPID.toString()) {
                                            fi.selected(true);
                                        }
                                    });
                                    linkedMembersGroup.items(results);
                                }
                                _this.dynamicFilters.filterGroups(filterGroups);
                                _this.finaliseFilters(textGroup, availabilityGroup);
                            });
                        });
                    });
                }
                else {
                    _this.dynamicFilters.filterGroups(filterGroups);
                    _this.finaliseFilters(textGroup, availabilityGroup);
                }
            };
            _this.finaliseFilters = function (textGroup, availabilityGroup) {
                var filterGroups = _this.dynamicFilters.filterGroups();
                // There may have been filters passed in the query string so try and apply them
                _this.applyQueryStringFilters(filterGroups);
                // Remove any tag groups which contain no tags
                filterGroups = filterGroups.filter(function (g) { return g.items().length > 0; });
                // Add the text filter to the beginning of the groups array.
                if (textGroup) {
                    filterGroups.unshift(textGroup);
                }
                // The availability group is valid if it has only one item so add it back to the array.
                if (availabilityGroup.items().length === 1 && filterGroups.filter(function (x) { return x.name === 'Availability'; }).length == 0) {
                    filterGroups.push(availabilityGroup);
                }
                // Sort all filter items by either the specific order given else alphabetically by name.
                for (var _i = 0, filterGroups_1 = filterGroups; _i < filterGroups_1.length; _i++) {
                    var group = filterGroups_1[_i];
                    group.items().sort(function (a, b) { return a.order ? a.order - b.order : (a.name > b.name ? 1 : -1); });
                }
                _this.dynamicFilters.filterGroups(filterGroups);
                _this.dynamicFilters.filterGroups().map(function (fg) { return fg.items.valueHasMutated(); });
                // Reorder filters so as linked members at the end of the array
                var filters = _this.dynamicFilters.filterGroups;
                filters.sort(function (a, b) {
                    return a.key === "_linkedMembers" ? 1 : -1;
                });
                //Re-apply the currently selected saved filter to new filters (if applicable)
                _this.messaging.publish("ReapplyActiveSavedSearch");
            };
            _this.generateLinkedMemberFilters = function () {
                return new Promise(function (resolve) {
                    var items = [];
                    var _loop_3 = function (lm) {
                        var lmKey = lm.PersonId.toString();
                        if (!items.some(function (i) { return i.key === lmKey; })) {
                            items.push(new FilterItem({
                                name: (lm.Name.trim()) ? lm.Name.trim() : lm.EmailAddress,
                                key: lmKey,
                                title: '',
                                searchText: undefined,
                                selected: false,
                                check: function (b) { return _this.reloadBookings(lm.PersonId); },
                                order: undefined
                            }));
                        }
                    };
                    // For each membership price add all relevant linked members as filters to the group if they do not exist.
                    for (var _i = 0, _a = _this.linkedMembers(); _i < _a.length; _i++) {
                        var lm = _a[_i];
                        _loop_3(lm);
                    }
                    resolve(items);
                });
            };
            _this.reloadBookings = function (personId) {
                if (personId != _this.getBookingsLastPID) {
                    _this.filteredMemberPk = personId;
                    if (!_this.isBookingLoading) {
                        _this.isBookingLoading = true;
                        _this.tncService.getLatestBookingTermsAndConditions(personId).done(function (result) {
                            if (result) {
                                _this.termsAndConditions(new TermsAndConditionsItem(result, _this.messaging.hostUrl, _this.viewHtml, false, false));
                            }
                            else {
                                _this.termsAndConditions(null);
                            }
                            _this.getBookings(personId);
                        });
                    }
                }
                return true;
            };
            _this.getLinkedMembers = function () {
                return new Promise(function (resolve) {
                    _this.memberService.getLinkedMembers().done(function (results) {
                        resolve(results);
                    });
                });
            };
            _this.getPrimePerson = function () {
                return new Promise(function (resolve) {
                    _this.memberService.getPrimePayer().done(function (result) {
                        resolve(result);
                    });
                });
            };
            _this.applyQueryStringFilters = function (filterGroups) {
                if (_this.queryStringFiltersApplied) {
                    return;
                }
                if (!_this.dynamicFilters.filterData) {
                    _this.dynamicFilters.filterData = new Array();
                }
                var qParams = UrlHelpers.paramsFromQueryString(window.location.search);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.ActivityFilterGroupKey, filterEnums_1.MatchBy.Key);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.LocationsFilterGroupKey, filterEnums_1.MatchBy.Key);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.TimeFilterGroupKey, filterEnums_1.MatchBy.Key);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.TagsFilterGroupKey, filterEnums_1.MatchBy.Key);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.TypeFilterGroupKey, filterEnums_1.MatchBy.Key);
                _this.dynamicFilters.applyQueryStringElement(filterGroups, qParams, BookingFilterKeys.AvailabilityFilterGroupKey, filterEnums_1.MatchBy.Key);
                //If a search string has been defined in the query string, find the text search group and update it.
                var searchString = qParams[BookingFilterKeys.SearchFilterGroupKey];
                if (searchString) {
                    var textGroup = _this.dynamicFilters.filterGroups().filter(function (bf) { return bf.key == BookingFilterKeys.SearchFilterGroupKey; }).pop();
                    var textFilter = textGroup.items()[0];
                    textFilter.searchText(searchString);
                    _this.dynamicFilters.filterData.push(ko.toJS(textGroup));
                }
                _this.queryStringFiltersApplied = true;
            };
            _this.eventTypeLookup = { 0: 'Activity', 2: 'Course', 1: 'Class', 4: "Ticketed Activity" };
            _this.sortBookings = function (o) {
                _this.bookings.sort(function (a, b) {
                    if (a[o.field] < b[o.field]) {
                        return (o.desc) ? 1 : -1;
                    }
                    if (a[o.field] > b[o.field]) {
                        return (o.desc) ? -1 : 1;
                    }
                    return (a.heading < b.heading) ? -1 : 1;
                });
            };
            _this.selectSublocation = function (b) {
                if (b.useNotifyMeLists) {
                    _this.getAvailablePlaces(b, "SelectSubLocation");
                }
                else {
                    _this.getSublocationsForActivity(b, true, false);
                }
            };
            _this.viewTicketPrices = function (b) {
                var tempb = b;
                if (moment.duration(moment(b.EndSales).diff(new Date())).asMinutes() < 0) {
                    b.errorMessage("Tickets unavailable for purchase at this time.");
                    setTimeout(function () { b.errorMessage(''); }, 10000);
                    return;
                }
                else {
                    _this.messaging.requireLogin();
                    _this.userPersonService.userHasTicketingRequirements().done(function (requirements) {
                        if (requirements.EmailPresent && requirements.PhonePresent) {
                            _this.bookingService.getTicketDetail(tempb.ticketId, _this.filteredMemberPk).done(function (result) {
                                var res = result;
                                var detailedBooking = new booking(res);
                                b = detailedBooking;
                                _this.pendingBookingObs(b);
                                _this.pendingBookingObj = b;
                                if (result.TicketActive == false) {
                                    var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                                    bookinglistTicket.availability("Not Availiable");
                                    bookinglistTicket.errorMessage("This ticketed activity is no longer available.");
                                    return;
                                }
                                if (result.AvailablePlaces < 1) {
                                    var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                                    bookinglistTicket.availability("Fully Booked");
                                    bookinglistTicket.availablePlaces(result.AvailablePlaces);
                                    return;
                                }
                                if (result.TermsAndConditionsUrl != null && result.TermsAndConditionsUrl != "") {
                                    _this.termsAndConditionsUrl = ko.observable(result.TermsAndConditionsUrl);
                                    _this.termsAndConditionsButtonVisible = ko.observable(true);
                                }
                                else {
                                    _this.termsAndConditionsUrl = ko.observable("");
                                    _this.termsAndConditionsButtonVisible = ko.observable(false);
                                }
                                _this.viewTicketPricesModalVisible(true);
                                _this.dialogHasFocus(true);
                            });
                        }
                        else if (requirements.EmailPresent == false && requirements.PhonePresent == false) {
                            b.errorMessage("A verified email address is required before tickets can be purchased. Please provide a contact number on the Profile Page before adding tickets to the basket.");
                            setTimeout(function () { b.errorMessage(''); }, 10000);
                        }
                        else if (requirements.EmailPresent == false && requirements.PhonePresent == true) {
                            b.errorMessage("A verified email address is required before tickets can be purchased.");
                            setTimeout(function () { b.errorMessage(''); }, 10000);
                        }
                        else if (requirements.PhonePresent == false && requirements.EmailPresent == true) {
                            b.errorMessage("Please provide a contact number on the Profile Page before adding tickets to the basket.");
                            setTimeout(function () { b.errorMessage(''); }, 10000);
                        }
                    });
                }
            };
            _this.closeTicketPrices = function () {
                _this.dialogHasFocus(false);
                _this.viewTicketPricesModalVisible(false);
            };
            _this.getAvailablePlaces = function (b, action) {
                _this.bookingService.getFreeSpaces(b.bookingObj).done(function (result) {
                    if (action == "BookNow") {
                        if (result >= 1) {
                            b.availablePlaces(result);
                            _this.bookNowConfirmationRequest(b);
                        }
                        else {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            b.errorMessage("All spaces now fully booked.");
                            setTimeout(function () { b.errorMessage(''); }, 5000);
                        }
                    }
                    else if (action == "SelectSubLocation") {
                        if (result >= 1) {
                            b.availablePlaces(result);
                            _this.getSublocationsForActivity(b, true, false);
                        }
                        else {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            b.errorMessage("All spaces now fully booked.");
                            setTimeout(function () { b.errorMessage(''); }, 5000);
                        }
                    }
                    else if (action == "Notify") {
                        if (result < 1) {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            _this.notifyMeConfirmationRequest(b);
                        }
                        else {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            b.successMessage("Spaces now available. You may now add this to your basket.");
                            setTimeout(function () { b.successMessage(''); }, 5000);
                        }
                    }
                    else if (action == "AddToBasket") {
                        if (result < 1) {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            b.errorMessage("All spaces now fully booked.");
                            setTimeout(function () { b.errorMessage(''); }, 5000);
                        }
                        else {
                            b.availablePlaces(result);
                            _this.addToBasketRequest(b);
                        }
                    }
                    else if (action == "AddToBasketUsingBookingSequence") {
                        if (result < 1) {
                            b.isAddingToBasket(false);
                            b.bookingEnabled(true);
                            b.availablePlaces(result);
                            b.errorMessage("All spaces now fully booked.");
                            setTimeout(function () { b.errorMessage(''); }, 5000);
                        }
                        else {
                            b.availablePlaces(result);
                            _this.addToBasketUsingBookingSequenceRequest(b);
                        }
                    }
                });
            };
            _this.getSublocationsForActivity = function (b, showModal, quickBook) {
                b.selectedSubLocationGroup('');
                b.selectedSubLocationGroupName('');
                var startDateTime = moment(b.startTime).toDate();
                var endDateTime = moment(startDateTime).add(b.duration, "minutes").toDate();
                if (startDateTime < new Date()) {
                    b.errorMessage("This activity has already begun.");
                    return;
                }
                _this.bookingService.getSubLocationGroupsForActivity(b.siteId, b.activityCode, b.locationCode, startDateTime, endDateTime).done(function (results) {
                    b.subLocationGroups(results);
                    var nextSubLocationGroup = results.filter(function (x) { return x.Available; }).sort(function (a, b) { return (a.SubLocationGroupPriority > b.SubLocationGroupPriority) ? 1 : ((b.SubLocationGroupPriority > a.SubLocationGroupPriority) ? -1 : 0); })[0];
                    if (nextSubLocationGroup) {
                        b.selectedSubLocationGroup(nextSubLocationGroup.SubLocationGroupId.toString());
                        b.selectedSubLocationGroupName(nextSubLocationGroup.SubLocationNames);
                    }
                    if (quickBook && b.eventType == 0 && b.selectedSubLocationGroup() == '') {
                        b.errorMessage("This activity is fully booked.");
                    }
                    _this.pendingBookingObs(b);
                    _this.pendingBookingObj = b;
                    if (showModal) {
                        _this.selectSublocationModalVisible(true);
                        _this.selectSubLocationModalTitle(b.locationTypeSingular);
                        _this.dialogHasFocus(true);
                    }
                });
            };
            _this.addToBasket = function (b) {
                b.suspendBooking();
                b.isAddingToBasket(true);
                if (b.useNotifyMeLists) {
                    _this.getAvailablePlaces(b, "AddToBasket");
                }
                else {
                    _this.addToBasketRequest(b);
                }
            };
            _this.addToBasketRequest = function (b) {
                _this.generateBasketItem(b).then(function (basketItem) {
                    _this.basket.addToBasket(basketItem, function () {
                        _this.basketIsEmpty(false);
                        b.availablePlaces(b.availablePlaces() - 1);
                        b.isAddingToBasket(false);
                        b.itemInBasket(true);
                        _this.closeSelectSublocationModal();
                    }, function (e) {
                        if (e.Message === "crossSiteBasketsDetected") {
                            _this.getSublocationsForActivity(b, false, false);
                            _this.showPresentCrossSiteBasketsModal(true);
                            e.Message = "Processing request.";
                        }
                        b.errorMessage(e.Message);
                        b.isAddingToBasket(false);
                        setTimeout(function () { b.errorMessage(''); _this.getSublocationsForActivity(b, false, false); }, 5000);
                    });
                }, function () {
                    b.errorMessage("An unexpected error has occurred.");
                    setTimeout(function () { b.errorMessage(''); _this.closeSelectSublocationModal(); }, 5000);
                });
                _this.dialogHasFocus(false);
            };
            _this.isBookingAffected = function (bookedLocationCode, bookedStartTime, bookedDuration, b) {
                var bookedUntil = moment(bookedStartTime).add(bookedDuration, "minutes").toDate();
                if (b.locationCode === bookedLocationCode.toString().trim() && b.startTime >= bookedStartTime && moment(b.startTime).toDate() < bookedUntil) {
                    return true;
                }
                return false;
            };
            _this.generateBasketItem = function (b) {
                var type;
                var meta;
                if (b.eventType == 0) {
                    type = "Xn.Booking";
                    meta = {};
                    var selectedSublocationIndex_1 = parseInt(b.selectedSubLocationGroup());
                    meta[BookingMetadataKeys.ActivityCode] = b.activityCode;
                    meta[BookingMetadataKeys.LocationCode] = b.locationCode;
                    meta[BookingMetadataKeys.LocationTypeSingular] = b.locationTypeSingular;
                    meta[BookingMetadataKeys.ActivityGroupId] = b.activityGroupId;
                    meta[BookingMetadataKeys.SubLocationGroup] = selectedSublocationIndex_1;
                    meta[BookingMetadataKeys.SubLocationDescription] = b.subLocationGroups().filter(function (x) { return x.SubLocationGroupId == selectedSublocationIndex_1; }).pop().SubLocationNames; //Select SubLocationName from selected ID
                }
                else if ((b.eventType == 1) || (b.eventType == 2)) {
                    type = "Xn.Enrolment";
                    meta = {};
                    var CourseOrSes = (b.eventType === 2 ? "C" : "S");
                    var enrolmentType = (b.eventType === 2 ? 1 : 2); //Enrolement Types: 1 = Course, 2 = Session
                    meta[EnrolmentMetadataKeys.EnrolmentType] = enrolmentType;
                    meta[EnrolmentMetadataKeys.GroupCode] = b.groupCode;
                    meta[EnrolmentMetadataKeys.Code] = b.courseCode;
                    meta[EnrolmentMetadataKeys.PriceStruct] = b.priceStruct;
                    meta[EnrolmentMetadataKeys.PriceBand] = b.priceBand;
                    meta[EnrolmentMetadataKeys.CourseOrSes] = CourseOrSes;
                    meta[EnrolmentMetadataKeys.EnrolmentNumber] = -1; //An invalid value, which must be overwritten when adding the record to the Advantage Enrolments table
                    meta[EnrolmentMetadataKeys.SequenceNo] = b.sequenceNo;
                    meta[EnrolmentMetadataKeys.ActivityGroupId] = b.activityGroupId;
                    meta[EnrolmentMetadataKeys.LocationTypeSingular] = b.locationTypeSingular;
                    meta[EnrolmentMetadataKeys.ActivityCode] = b.activityCode;
                    meta[EnrolmentMetadataKeys.LocationCode] = b.locationCode;
                }
                else if (b.eventType == 4) {
                    type = "Xn.TicketedActivity";
                    meta = {};
                    var ticketpriceDetail = new Array();
                    b.ticketPrices().forEach(function (item) {
                        ticketpriceDetail.push(JSON.stringify(item.generateNewTicketPriceDtoObj()));
                    });
                    meta[TicketedActivityMetadataKeys.PurchasingDetails] = "[" + ticketpriceDetail.toString() + "]";
                    meta[TicketedActivityMetadataKeys.TicketId] = b.ticketId;
                    meta[TicketedActivityMetadataKeys.ActivityId] = b.ticketActivityId;
                    meta[TicketedActivityMetadataKeys.SalesStart] = b.StartSales;
                    meta[TicketedActivityMetadataKeys.SalesEnd] = b.EndSales;
                }
                meta["LocationDescription"] = b.locationDescription;
                meta["StartTime"] = b.startTime;
                meta["EndTime"] = b.endTime;
                return new Promise(function (resolve, reject) {
                    _this.messaging.getSitesPromise().done(function (sites) {
                        meta["SiteName"] = sites.filter(function (s) { return s.Id === b.siteId; }).pop().DisplayName;
                        var basketItem = new BasketItem();
                        basketItem.Description = b.heading;
                        basketItem.Type = type;
                        basketItem.DisplayOrder = 1;
                        basketItem.SiteId = b.siteId;
                        basketItem.BasketItemMetadata = meta;
                        basketItem.ItemOwnerPersonFK = _this.getBookingsLastPID;
                        resolve(basketItem);
                    }).fail(reject);
                });
            };
            //This handles the quick-book click
            _this.bookNowConfirmation = function (b) {
                if (b.useNotifyMeLists) {
                    _this.getAvailablePlaces(b, "BookNow");
                }
                else {
                    _this.bookNowConfirmationRequest(b);
                }
            };
            _this.bookNowConfirmationRequest = function (b) {
                var startDateTime = moment(b.startTime).toDate();
                //CHeck the activity or class has not started. i.e the scenerio where the 
                // page hasn't been refreshed in a while TFS 24349.
                if (startDateTime < new Date()) {
                    b.errorMessage("This activity has already begun.");
                    return;
                }
                b.isAddingToBasket(true);
                if (b.eventType == 0) {
                    _this.getSublocationsForActivity(b, false, true);
                }
                if (b.errorMessage().length == 0) {
                    _this.pendingBookingObs(b);
                    _this.pendingBookingObj = b;
                    _this.checkIfBookingsNeedMoreInfo();
                    _this.showBookNowConfirm(true);
                }
            };
            _this.addToBasketUseBookingSequence = function (b) {
                b.isAddingToBasket(true);
                b.suspendBooking();
                if (b.useNotifyMeLists) {
                    _this.getAvailablePlaces(b, "AddToBasketUsingBookingSequence");
                }
                else {
                    _this.addToBasketUsingBookingSequenceRequest(b);
                }
            };
            _this.addToBasketUsingBookingSequenceRequest = function (b) {
                b.selectedSubLocationGroup('');
                b.selectedSubLocationGroupName('');
                var startDateTime = moment(b.startTime).toDate();
                var endDateTime = moment(startDateTime).add(b.duration, "minutes").toDate();
                if (startDateTime < new Date()) {
                    b.errorMessage("This activity has already begun.");
                    return;
                }
                _this.bookingService.getSubLocationGroupsForActivity(b.siteId, b.activityCode, b.locationCode, startDateTime, endDateTime).done(function (results) {
                    b.subLocationGroups(results);
                    var nextSubLocationGroup = results.filter(function (x) { return x.Available; }).sort(function (a, b) { return (a.SubLocationGroupPriority > b.SubLocationGroupPriority) ? 1 : ((b.SubLocationGroupPriority > a.SubLocationGroupPriority) ? -1 : 0); })[0];
                    if (nextSubLocationGroup) {
                        b.selectedSubLocationGroup(nextSubLocationGroup.SubLocationGroupId.toString());
                        b.selectedSubLocationGroupName(nextSubLocationGroup.SubLocationNames);
                    }
                    if (b.eventType == 0 && b.selectedSubLocationGroup() == '') {
                        b.errorMessage("This activity is fully booked.");
                    }
                    _this.pendingBookingObs(b);
                    _this.pendingBookingObj = b;
                    _this.addToBasketRequest(b);
                });
            };
            _this.addTicketsToBasket = function (b) {
                if (moment.duration(moment(b.EndSales).diff(new Date())).asMinutes() < 0) {
                    _this.closeTicketPrices();
                    b.errorMessage("Tickets unavailable for purchase at this time.");
                    setTimeout(function () { b.errorMessage(''); }, 10000);
                    var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                    bookinglistTicket.errorMessage("Tickets unavailable for purchase at this time.");
                    setTimeout(function () { bookinglistTicket.errorMessage(''); }, 10000);
                    return;
                }
                else {
                    b.isAddingToBasket(true);
                    _this.isAddingTicketToBasket(true);
                    b.suspendBooking();
                    _this.bookingService.getTicketDetail(b.ticketId, _this.filteredMemberPk).done(function (result) {
                        if (result.TicketActive == false) {
                            b.errorMessage("This ticketed activity is no longer available.");
                            var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                            bookinglistTicket.availability("Not Availiable");
                            bookinglistTicket.errorMessage("This ticketed activity is no longer available.");
                            return;
                        }
                        var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                        bookinglistTicket.availablePlaces(result.AvailablePlaces);
                        if (result.AvailablePlaces < 1) {
                            b.errorMessage("This ticketed activity is no longer available.");
                            var bookinglistTicket = _this.bookings().filter(function (x) { return x.ticketId == b.ticketId; })[0];
                            bookinglistTicket.availablePlaces(0);
                        }
                        result.TicketPrices.forEach(function (item) {
                            var price = b.ticketPrices().filter(function (x) { return x.priceId == item.PriceId; })[0];
                            if (price.purchasingQuantity() > item.AvailableQuantityOfGroup) {
                                b.errorMessage("The number of spaces selected exceeds the number spaces available for this activity");
                                price.availableTickets(item.AvailableQuantityOfGroup);
                                setTimeout(function () { b.errorMessage(''); b.isAddingToBasket(false); }, 10000);
                                var subscription = price.purchasingQuantity.subscribe(function (newvalue) {
                                    b.errorMessage("");
                                    b.isAddingToBasket(false);
                                    b.bookingEnabled(true);
                                    subscription.dispose();
                                });
                                return;
                            }
                        });
                        var totalPurchasingNumber = 0;
                        b.ticketPrices().forEach(function (item) {
                            totalPurchasingNumber = totalPurchasingNumber + (item.purchasingQuantity() * item.spacesPerTicket);
                        });
                        if (totalPurchasingNumber > result.AvailablePlaces) {
                            b.errorMessage("The number of spaces selected exceeds the number spaces available for this activity");
                            b.availablePlaces(result.AvailablePlaces);
                            setTimeout(function () { b.errorMessage(''); b.isAddingToBasket(false); }, 10000);
                            result.TicketPrices.forEach(function (item) {
                                var price = b.ticketPrices().filter(function (x) { return x.priceId == item.PriceId; })[0];
                                var subscription = price.purchasingQuantity.subscribe(function (newvalue) {
                                    b.errorMessage("");
                                    b.isAddingToBasket(false);
                                    b.bookingEnabled(true);
                                    subscription.dispose();
                                });
                            });
                            return;
                        }
                        if (totalPurchasingNumber < 1) {
                            b.errorMessage("Please select at least one ticket");
                            setTimeout(function () { b.errorMessage(''); b.isAddingToBasket(false); }, 10000);
                            result.TicketPrices.forEach(function (item) {
                                var price = b.ticketPrices().filter(function (x) { return x.priceId == item.PriceId; })[0];
                                var subscription = price.purchasingQuantity.subscribe(function (newvalue) {
                                    b.errorMessage("");
                                    b.isAddingToBasket(false);
                                    b.bookingEnabled(true);
                                    subscription.dispose();
                                });
                            });
                            return;
                        }
                        if (b.errorMessage().length == 0) {
                            b.availablePlaces(result.AvailablePlaces);
                            _this.generateBasketItem(b).then(function (basketItem) {
                                _this.basket.addToBasket(basketItem, function () {
                                    _this.basketIsEmpty(false);
                                    b.availablePlaces(b.availablePlaces() - totalPurchasingNumber);
                                    b.isAddingToBasket(false);
                                    b.itemInBasket(true);
                                    _this.closeTicketPrices();
                                }, function (e) {
                                    if (e.Message === "crossSiteBasketsDetected") {
                                        _this.getSublocationsForActivity(b, false, false);
                                        _this.showPresentCrossSiteBasketsModal(true);
                                        e.Message = "Processing request.";
                                        _this.closeTicketPrices();
                                    }
                                    b.errorMessage(e.Message);
                                    b.isAddingToBasket(false);
                                    setTimeout(function () { b.errorMessage(''); }, 5000);
                                });
                            });
                        }
                    });
                }
            };
            _this.notifyMeConfirmation = function (b) {
                _this.getAvailablePlaces(b, "Notify");
            };
            _this.notifyMeConfirmationRequest = function (b) {
                _this.messaging.requireLogin();
                var startDateTime = moment(b.startTime).toDate();
                if (startDateTime < new Date()) {
                    b.errorMessage("This activity has already begun.");
                    return;
                }
                if (_this.emulateePersonPk != null) {
                    _this.userPersonService.getPersonHasNonDefaultEmailAddress(_this.emulateePersonPk).done(function (emailUniqueToPerson) {
                        if (emailUniqueToPerson == false) {
                            b.errorMessage("Please provide an email address to use this functionality.");
                            return;
                        }
                    });
                }
                else {
                    _this.userPersonService.getPersonHasNonDefaultEmailAddress(_this.user().DimensionPersonPk).done(function (emailUniqueToPerson) {
                        if (emailUniqueToPerson == false) {
                            b.errorMessage("Please provide an email address to use this functionality.");
                            return;
                        }
                    });
                }
                _this.bookingService.getPersonAlreadyRegisteredNotifyMe(b.bookingObj).done(function (onList) {
                    if (onList) {
                        b.errorMessage("You are already on the list for notification");
                        return;
                    }
                    else {
                        _this.bookingService.getPersonBookedOnBooking(b.bookingObj).done(function (alreadyBooked) {
                            if (alreadyBooked) {
                                b.errorMessage("You are already booked on to this activity");
                                return;
                            }
                            else {
                                if (b.errorMessage() === "") {
                                    _this.pendingBookingObj = b;
                                    _this.showNotifyMeConfirmModal(true);
                                }
                                return;
                            }
                        });
                    }
                });
            };
            _this.notifyMeHandler = function () {
                _this.messaging.requireLogin();
                var startDateTime = moment(_this.pendingBookingObj.startTime).toDate();
                _this.showNotifyMeConfirmModal(false);
                if (startDateTime < new Date()) {
                    _this.pendingBookingObj.errorMessage("This activity has already begun.");
                    return;
                }
                _this.bookingService.registerInterest(_this.pendingBookingObj.bookingObj).done(function () {
                    _this.pendingBookingObj.successMessage("You will be emailed if a space becomes available.");
                }).fail(function (errorMessage) {
                    _this.pendingBookingObj.errorMessage(errorMessage);
                    return;
                });
            };
            _this.closeNotifyMeConfirm = function () {
                _this.showNotifyMeConfirmModal(false);
            };
            _this.closeBookNowConfirm = function () {
                _this.showBookNowConfirm(false);
                var b = _this.pendingBookingObj;
                b.isAddingToBasket(false);
                if (_this.termsAndConditions()) {
                    _this.termsAndConditions().iAgree(false);
                }
            };
            _this.showSelectSublocationModal = function (b) {
                _this.pendingBookingObs(b);
                _this.pendingBookingObj = b;
                _this.selectSublocationModalVisible(true);
                _this.dialogHasFocus(true);
            };
            _this.closeSelectSublocationModal = function () {
                _this.pendingBookingObj = null;
                _this.pendingBookingObs(null);
                _this.dialogHasFocus(false);
                _this.selectSublocationModalVisible(false);
            };
            _this.closeShowPresentCrossSiteBasketsModal = function () {
                _this.showPresentCrossSiteBasketsModal(false);
            };
            _this.keepBasketHandler = function () {
                _this.basketService.deleteMyBasket().done(function () {
                    return _this.addToBasketRequest(_this.pendingBookingObj);
                });
                _this.closeShowPresentCrossSiteBasketsModal();
            };
            _this.bookNowHandler = function () {
                _this.showBookNowConfirm(false);
                if (_this.termsAndConditions()) {
                    new DocumentService().savePersonDocument([new PersonDocument({ AssetId: _this.termsAndConditions().Id, PersonId: _this.filteredMemberPk })]).done(function () {
                        _this.termsAndConditions(undefined);
                    });
                }
                var b = _this.pendingBookingObj;
                b.isAddingToBasket(true);
                _this.generateBasketItem(b).then(function (basketItem) {
                    basketItem.Id = 0;
                    basketItem.GrossAmount = 0;
                    basketItem.VATCode = 'S';
                    _this.oneClickService.oneClick(basketItem)
                        .done(function (result) {
                        var forTranslation = "booking confirmation";
                        var successMessage = "Booking complete. Your <a href='http://url_placeholder' target='_blank'>booking confirmation</a> has been sent to your email.";
                        b.successMessage(successMessage.replace("http://url_placeholder", result.ConfirmationUrl));
                        b.availablePlaces(b.availablePlaces() - 1);
                        b.isAddingToBasket(false);
                        b.itemInBasket(true);
                    }).fail(function (e) {
                        b.errorMessage(e.responseJSON.Message);
                        b.isAddingToBasket(false);
                        _this.messaging.publish('basket.RefreshBasket');
                        setTimeout(function () { b.errorMessage(''); }, 10000);
                    });
                }, function () {
                    b.errorMessage("An unexpected error has occurred.");
                    setTimeout(function () { b.errorMessage(''); }, 10000);
                });
            };
            _this.getPersonDetails = function (beneficiaryId) {
                _this.basketAdditionalService.personDetailsPopulated(false);
                _this.userPersonService.getPersonDetailsForBooking(beneficiaryId).done(function (personDetails) {
                    _this.basketAdditionalService.setPersonDetailsForBooking(personDetails);
                    _this.bookingForName("(for " + personDetails.Forenames + " " + personDetails.Surname + ")");
                });
            };
            _this.viewHtml = function (item) {
                $.get(_this.messaging.hostUrl + "assetsList/ViewAsset?assetId=" + item.Id).done(function (result) {
                    var elem = document.getElementById("xn-view-html-modal");
                    ko.cleanNode(elem);
                    ko.applyBindingsToDescendants({ showModal: ko.observable(true), assetContent: result, closeModal: _this.closeHtmlModal }, elem);
                });
            };
            _this.closeHtmlModal = function (modal) {
                modal.showModal(false);
            };
            if (basketAdditionalService == null) {
                _this.basketAdditionalService = BasketAdditionalService.instance(new CookieService(), new BasketService(), new ConfigurationService());
            }
            else {
                _this.basketAdditionalService = basketAdditionalService;
            }
            if (userPersonService == null) {
                _this.userPersonService = new UserPersonService();
            }
            else {
                _this.userPersonService = userPersonService;
            }
            if (memberService == null) {
                _this.memberService = new MemberService();
            }
            else {
                _this.memberService = memberService;
            }
            //Add timeOfDay functionality to Window so that serialised functions can access it.
            if (!window.XN_timeOfDay) {
                window.XN_timeOfDay = TimeOfDay.timeOfDay;
            }
            _this.initialiseDynamicFiltering();
            _this.selectedOrder.subscribe(_this.sortBookings);
            _this.setDateFromQueryString();
            _this.messaging.getUserAndSubscribe('bookings', function (user) {
                // Each time user changes get bookings again
                _this.getBookingsAndLoadFilter();
            });
            // Each time site id changes get bookings again
            _this.messaging.subscribeToSiteId(function () {
                _this.dynamicFilters.filterGroups.removeAll();
                _this.dynamicFilters.bookingLoadFilter(null);
                _this.getBookingsAndLoadFilter();
            }, true);
            _this.messaging.subscribe('bookings', 'basket.RefreshBasket', function () { return _this.checkBasket; });
            _this.checkBasket();
            _this.messaging.subscribe('bookings', 'ChangeLoadActivitiesBookingLoadFilter', function (loadActivities) { _this.loadActivitiesChange(loadActivities); });
            _this.messaging.subscribe('bookings', 'ChangeLoadSessionsBookingLoadFilter', function (loadsessionsCourses) { _this.loadSessionCoursesChange(loadsessionsCourses); });
            _this.messaging.subscribe('bookings', 'ChangeLoadTicketedActivitesLoadFilter', function (loadTicketedActivities) { _this.loadTicketedActivitiesChange(loadTicketedActivities); });
            _this.termsAndConditionsUrl = ko.observable('');
            _this.termsAndConditionsButtonVisible = ko.observable(false);
            _this.tncService.getLatestBookingTermsAndConditions(0).done(function (result) {
                if (result) {
                    _this.termsAndConditions(new TermsAndConditionsItem(result, _this.messaging.hostUrl, _this.viewHtml, false, false));
                }
            });
            _this.selectedDate.subscribe(function (newVal) {
                _this.getBookingsAndLoadFilter();
            });
            _this.messaging.subscribe('timetable', 'timetable.dayChanged', function (newDate) {
                _this.selectedDate(newDate);
            });
            _this.showBookNowConfirmModal = ko.computed(function () {
                return _this.showBookNowConfirm() && _this.basketAdditionalService.isMinimumPersonDetailsForBookingCollected(); // !this.quickBookBookingsNeedMoreInfo();
            }, self);
            _this.quickBookEnabled = ko.computed(function () {
                return _this.basketAdditionalService.personDetailsPopulated();
            }, self);
            //If Item has been removed from the basket summary refresh the bookings
            _this.messaging.subscribe('bookings', 'deleteBasketItem', function () {
                _this.getBookingsAndLoadFilter();
            });
            _this.memberService.getConfigSettings().done(function (result) {
                _this.allowPurchaseLinkedBookings = result.AllowBookingLinkedMembers;
            });
            return _this;
        }
        return BookingListViewModel;
    }(component));
    return { viewModel: BookingListViewModel, template: require("text!./bookingListTemplate.html") };
});
//# sourceMappingURL=bookingListViewModel.js.map