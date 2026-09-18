import { getHolidayService } from "@kalo/lib/holidays";

export async function getSupportedCountriesHandler() {
  const holidayService = getHolidayService();
  return holidayService.getSupportedCountries();
}

export default getSupportedCountriesHandler;
