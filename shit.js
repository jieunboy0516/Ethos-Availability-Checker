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
define(["require", "exports", "component", "knockout", "moment", "Areas/Widgets/Script/common/DateFormattingUtilities", "text!./daySelectorTemplate.html"], function (require, exports, component, ko, moment, DateFormattingUtilities) {
    "use strict";
    ko.bindingHandlers.element = {
        init: function (element, valueAccessor) {
            var target = valueAccessor();
            target(element);
        }
    };
    var dayType = /** @class */ (function () {
        function dayType(date, name, label, selected, moment) {
            this.date = date;
            this.name = name;
            this.label = label;
            this.selected = ko.observable(selected);
            this.el = ko.observable();
            this.moment = moment;
        }
        Object.defineProperty(dayType.prototype, "visible", {
            get: function () {
                if (this.el()) {
                    return this.el().offsetParent !== null;
                }
            },
            enumerable: true,
            configurable: true
        });
        return dayType;
    }());


    
    var ChangeType;
    (function (ChangeType) {
        ChangeType[ChangeType["PrevDay"] = 0] = "PrevDay";
        ChangeType[ChangeType["NextDay"] = 1] = "NextDay";
        ChangeType[ChangeType["DayClick"] = 2] = "DayClick";
        ChangeType[ChangeType["CalendarSelect"] = 3] = "CalendarSelect";
    })(ChangeType || (ChangeType = {}));



    var daySelectorViewModel = /** @class */ (function (_super) {
        __extends(daySelectorViewModel, _super);
        function daySelectorViewModel(params) {
            var _this = _super.call(this) || this;
            _this.dateFormattingUtilities = new DateFormattingUtilities();
            _this.displayDateFormat = 'll'; // short date, eg 29 Aug 2018
            _this.selectDay = function () {
                return function (item) {
                    _this.selectedDate(item.moment);
                    _this.updateDaySelector(_this.selectedDate(), ChangeType.DayClick);
                    _this.messaging.publish(_this.uid + "timetable.dayChanged", _this.selectedDate());
                };
            };
            _this.showCalendar = function () {
                _this.messaging.publish(_this.uid + "timetable.displayCalendarPopup", true);
            };
            _this.prevDay = function () {
                var previousDay = moment(_this.selectedDate()).subtract(1, 'days');
                if (!(_this.disableLapsedDates && previousDay.isBefore(moment().startOf('day')))) {
                    var selectedDate = previousDay;
                    _this.updateDaySelector(selectedDate, ChangeType.PrevDay);
                    _this.messaging.publish((_this.uid ? _this.uid : '') + "timetable.dayChanged", selectedDate);
                }
            };
            _this.nextDay = function () {
                var selectedDate = moment(_this.selectedDate());
                selectedDate.add(1, 'days');
                _this.updateDaySelector(selectedDate, ChangeType.NextDay);
                console.log("test")
                
                _this.messaging.publish((_this.uid ? _this.uid : '') + "timetable.dayChanged", selectedDate);
            };
            _this.updateDaySelector = function (newDate, updateMethod) {
                _this.selectedDate(newDate);
                var visibleDays = _this.days().filter(function (d) { return d.visible; }).length;
                var dayFound = false;
                for (var _i = 0, _a = _this.days(); _i < _a.length; _i++) {
                    var d = _a[_i];
                    if (newDate.isSame(moment(d.date, _this.displayDateFormat)) && d.visible) {
                        d.selected(true);
                        dayFound = true;
                    }
                    else {
                        d.selected(false);
                    }
                }
                if (!dayFound) {
                    switch (updateMethod) {
                        case ChangeType.PrevDay:
                            _this.startDate(moment(_this.startDate()).subtract(1, 'days'));
                            break;
                        case ChangeType.NextDay:
                            _this.startDate(moment(_this.startDate()).add(1, 'days'));
                            break;
                        case ChangeType.CalendarSelect:
                            _this.startDate(_this.selectedDate());
                            break;
                        case ChangeType.DayClick:
                            //Day clicked must be in the visible range so no change to start date required
                            break;
                    }
                }
            };
            _this.populateDays = function () {
                var date = moment(_this.startDate());
                var i;
                _this.days([]);
                // Populate 7 days starting with the currently selected date to ensure it's always visible
                // The css takes care of hiding any days that shouldn't be displayed
                for (i = 0; i < 7; i++) {
                    _this.addDateToArray(date);
                    date.add(1, 'd');
                }
            };
            _this.addDateToArray = function (date) {
                var today = moment();
                var formattedDate = date.format(_this.displayDateFormat);
                var name = '';
                if (date.isSame(today, 'day')) {
                    moment().calendar;
                    name = 'Today';
                }
                else if (date.isSame(today.add(1, 'd'), 'day')) {
                    name = 'Tomorrow';
                }
                else {
                    name = date.format('dddd');
                }
                var label = _this.dateFormattingUtilities.elevateOrdinalShortMonth(date);
                var selected = date.isSame(moment(_this.selectedDate()));
                var localDate = moment(date.toDate());
                _this.days.push(new dayType(formattedDate, name, label, selected, localDate));
            };
            _this.uid = (typeof (params.uid) === "undefined") ? "" : params.uid;
            _this.startDate = params.selectedDate;
            _this.selectedDate = params.selectedDate;
            _this.days = ko.observableArray([]);
            _this.disableLapsedDates = params.disableLapsedDates;
            _this.isTimetable = ko.observable(params.isTimetable);
            _this.populateDays();
            _this.messaging.subscribe('daySelector', _this.uid + "timetable.daySelected", function (newDate) {
                _this.updateDaySelector(newDate, ChangeType.CalendarSelect);
                _this.messaging.publish(_this.uid + "timetable.dayChanged", newDate);
            });
            _this.startDate.subscribe(function () {
                _this.populateDays();
            });
            _this.messaging.subscribe('daySelector', _this.uid + "browser.resize", function () {
                _this.populateDays();
            });
            return _this;
        }
        return daySelectorViewModel;
    }(component));



    return { viewModel: daySelectorViewModel, template: require("text!./daySelectorTemplate.html") };
});
//# sourceMappingURL=daySelectorViewModel.js.map