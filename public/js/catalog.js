/* TourBus shared catalog.
 * UMD module: works in the browser (window.TourBusCatalog) AND in Node/Express (require).
 * Keeping ONE copy of the data means the server validates against exactly what the browser shows. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TourBusCatalog = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const cities = {
    Pune:{lat:18.5204,lng:73.8567,state:"Maharashtra"}, Mumbai:{lat:19.0760,lng:72.8777,state:"Maharashtra"},
    Nashik:{lat:19.9975,lng:73.7898,state:"Maharashtra"}, Goa:{lat:15.4909,lng:73.8278,state:"Goa"},
    Bengaluru:{lat:12.9716,lng:77.5946,state:"Karnataka"}, Delhi:{lat:28.6139,lng:77.2090,state:"Delhi"},
    Jaipur:{lat:26.9124,lng:75.7873,state:"Rajasthan"}, Mahabaleshwar:{lat:17.9237,lng:73.6586,state:"Maharashtra"},
    Hyderabad:{lat:17.3850,lng:78.4867,state:"Telangana"}, Lonavala:{lat:18.7546,lng:73.4062,state:"Maharashtra"},
    Shirdi:{lat:19.7668,lng:74.4769,state:"Maharashtra"}, Manali:{lat:32.2396,lng:77.1887,state:"Himachal Pradesh"},
    Alleppey:{lat:9.4981,lng:76.3388,state:"Kerala"}, Udaipur:{lat:24.5854,lng:73.7125,state:"Rajasthan"},
    Hampi:{lat:15.3350,lng:76.4600,state:"Karnataka"}, Rishikesh:{lat:30.0869,lng:78.2676,state:"Uttarakhand"},
    Aurangabad:{lat:19.8762,lng:75.3433,state:"Maharashtra"},
    Gokarna:{lat:14.5479,lng:74.3188,state:"Karnataka"}, Munnar:{lat:10.0889,lng:77.0595,state:"Kerala"},
    Ooty:{lat:11.4102,lng:76.6950,state:"Tamil Nadu"}, Coorg:{lat:12.3375,lng:75.8069,state:"Karnataka"},
    Pondicherry:{lat:11.9416,lng:79.8083,state:"Puducherry"}, Varanasi:{lat:25.3176,lng:82.9739,state:"Uttar Pradesh"},
    Agra:{lat:27.1767,lng:78.0081,state:"Uttar Pradesh"}, Amritsar:{lat:31.6340,lng:74.8723,state:"Punjab"},
    Darjeeling:{lat:27.0410,lng:88.2663,state:"West Bengal"}, Kolkata:{lat:22.5726,lng:88.3639,state:"West Bengal"},
    Chennai:{lat:13.0827,lng:80.2707,state:"Tamil Nadu"}, Kochi:{lat:9.9312,lng:76.2673,state:"Kerala"},
    Mysuru:{lat:12.2958,lng:76.6394,state:"Karnataka"}, Jodhpur:{lat:26.2389,lng:73.0243,state:"Rajasthan"},
    Jaisalmer:{lat:26.9157,lng:70.9083,state:"Rajasthan"}, Ahmedabad:{lat:23.0225,lng:72.5714,state:"Gujarat"},
    Srinagar:{lat:34.0837,lng:74.7973,state:"Jammu and Kashmir"}, Leh:{lat:34.1526,lng:77.5771,state:"Ladakh"},
    Dharamshala:{lat:32.2190,lng:76.3234,state:"Himachal Pradesh"}, Mussoorie:{lat:30.4598,lng:78.0644,state:"Uttarakhand"},
    Nainital:{lat:29.3919,lng:79.4542,state:"Uttarakhand"}, Puri:{lat:19.8135,lng:85.8312,state:"Odisha"},
    Madurai:{lat:9.9252,lng:78.1198,state:"Tamil Nadu"}, Kanyakumari:{lat:8.0883,lng:77.5385,state:"Tamil Nadu"},
    Tirupati:{lat:13.6288,lng:79.4192,state:"Andhra Pradesh"}, Nagpur:{lat:21.1458,lng:79.0882,state:"Maharashtra"},
    Bhopal:{lat:23.2599,lng:77.4126,state:"Madhya Pradesh"}, Indore:{lat:22.7196,lng:75.8577,state:"Madhya Pradesh"},
    Bhubaneswar:{lat:20.2961,lng:85.8245,state:"Odisha"}, Gangtok:{lat:27.3389,lng:88.6065,state:"Sikkim"},
    Tawang:{lat:27.5861,lng:91.8594,state:"Arunachal Pradesh"}, Andaman:{lat:11.7401,lng:92.6586,state:"Andaman and Nicobar Islands"},
    "Mount Abu":{lat:24.5926,lng:72.7156,state:"Rajasthan"}, Khajuraho:{lat:24.8318,lng:79.9199,state:"Madhya Pradesh"},
    "Jim Corbett":{lat:29.5300,lng:78.7747,state:"Uttarakhand"}, Kutch:{lat:23.7337,lng:69.8597,state:"Gujarat"},
    Kathmandu:{lat:27.7172,lng:85.3240,state:"Nepal"}, Bangkok:{lat:13.7563,lng:100.5018,state:"Thailand"},
    Singapore:{lat:1.3521,lng:103.8198,state:"Singapore"}, Dubai:{lat:25.2048,lng:55.2708,state:"United Arab Emirates"},
    Paris:{lat:48.8566,lng:2.3522,state:"France"}, London:{lat:51.5072,lng:-0.1276,state:"United Kingdom"},
    Colombo:{lat:6.9271,lng:79.8612,state:"Sri Lanka"}, "Kuala Lumpur":{lat:3.1390,lng:101.6869,state:"Malaysia"}
  };

  const bus = (id,operator,source,destination,departure,arrival,duration,fare,type,rating,amenities,capacity,bookedSeats) =>
    ({id,operator,source,destination,departure,arrival,duration,fare,type,rating,amenities,capacity,bookedSeats});
  const buses = [
    bus("BUS101","GreenLine Travels","Pune","Goa","21:00","07:00","10h",1200,"AC Sleeper",4.6,["Charging","Blanket","Water"],30,["S1","S2","S7","S8","S13","S14"]),
    bus("BUS102","Coastal Express","Pune","Goa","20:30","06:45","10h 15m",990,"Non-AC Sleeper",4.2,["Blanket","Water"],30,["S3","S4","S9","S10"]),
    bus("BUS103","Western Star","Pune","Mumbai","07:00","10:30","3h 30m",550,"AC Seater",4.4,["Charging","Wi-Fi"],32,["S1","S5","S6","S12"]),
    bus("BUS104","CityRide","Mumbai","Pune","18:00","21:30","3h 30m",600,"AC Seater",4.3,["Charging","Water"],32,["S2","S3","S11"]),
    bus("BUS105","Sunrise Travels","Mumbai","Goa","19:15","08:00","12h 45m",1450,"AC Sleeper",4.7,["Charging","Blanket","Water","Reading Light"],30,["S1","S2","S5","S6","S17","S18"]),
    bus("BUS106","Deccan Roadways","Pune","Bengaluru","20:00","08:30","12h 30m",1350,"AC Sleeper",4.5,["Charging","Blanket"],30,["S2","S3","S4","S9"]),
    bus("BUS107","Nashik Connect","Mumbai","Nashik","08:00","11:30","3h 30m",480,"AC Seater",4.1,["Charging"],32,["S2","S8","S9"]),
    bus("BUS108","Royal Rajasthan","Delhi","Jaipur","22:00","03:30","5h 30m",850,"AC Sleeper",4.6,["Charging","Blanket","Water"],30,["S1","S2","S11","S12"]),
    bus("BUS109","Hillview Travels","Pune","Mahabaleshwar","06:30","10:00","3h 30m",650,"AC Seater",4.3,["Water"],32,["S1","S3","S5"]),
    bus("BUS110","MetroLink","Mumbai","Pune","09:00","12:30","3h 30m",520,"Non-AC Seater",4.0,["Water"],32,["S1","S2","S3","S4","S5"]),
    bus("BUS111","Konkan Cruiser","Pune","Goa","22:15","08:15","10h",1550,"Luxury AC Sleeper",4.8,["Charging","Blanket","Water","Wi-Fi"],30,["S1","S2","S3","S4","S15","S16"]),
    bus("BUS112","Bengaluru Express","Bengaluru","Pune","19:30","08:00","12h 30m",1290,"AC Sleeper",4.4,["Charging","Blanket"],30,["S5","S6","S7","S8"]),
    bus("BUS113","Nashik Connect","Pune","Nashik","06:00","10:00","4h",520,"AC Seater",4.2,["Charging","Water"],32,["S1","S2","S6"]),
    bus("BUS114","Coastal Express","Goa","Pune","19:00","05:15","10h 15m",1100,"AC Sleeper",4.4,["Charging","Blanket"],30,["S3","S4","S10"]),
    bus("BUS115","Sunrise Travels","Goa","Mumbai","18:30","07:15","12h 45m",1400,"AC Sleeper",4.6,["Charging","Blanket","Water"],30,["S1","S2","S9","S10"]),
    bus("BUS116","Royal Rajasthan","Jaipur","Delhi","06:00","11:30","5h 30m",800,"AC Seater",4.5,["Charging","Water"],32,["S4","S5","S6"]),
    bus("BUS117","Deccan Roadways","Hyderabad","Bengaluru","21:30","06:30","9h",1050,"AC Sleeper",4.5,["Charging","Blanket"],30,["S2","S3","S11"]),
    bus("BUS118","Sai Yatra","Mumbai","Shirdi","22:30","04:30","6h",650,"AC Sleeper",4.4,["Charging","Blanket"],30,["S1","S7","S8"]),
    bus("BUS119","Ghat Express","Pune","Lonavala","08:30","10:15","1h 45m",250,"AC Seater",4.3,["Water"],32,["S2","S3"]),
    bus("BUS120","Himalayan Queen","Delhi","Manali","18:00","08:30","14h 30m",1650,"Volvo AC Sleeper",4.7,["Charging","Blanket","Water","Reading Light"],30,["S1","S2","S3","S12","S13"]),
    bus("BUS121","Heritage Rides","Jaipur","Udaipur","22:30","05:30","7h",780,"AC Sleeper",4.4,["Charging","Blanket"],30,["S2","S6"]),
    bus("BUS122","Deccan Roadways","Bengaluru","Hampi","21:00","05:30","8h 30m",1100,"AC Sleeper",4.5,["Charging","Blanket"],30,["S1","S5","S9"]),
    bus("BUS123","Gujarat Express","Ahmedabad","Jaipur","20:30","05:00","8h 30m",950,"AC Sleeper",4.4,["Charging","Blanket","Water"],30,["S1","S5","S10"]),
    bus("BUS124","Pink City Travels","Jaipur","Ahmedabad","21:00","05:30","8h 30m",920,"AC Sleeper",4.3,["Charging","Blanket"],30,["S2","S8","S13"]),
    bus("BUS125","Gujarat Express","Ahmedabad","Mumbai","19:00","07:00","12h",1250,"AC Sleeper",4.5,["Charging","Blanket","Water"],30,["S3","S7","S11"]),
    bus("BUS126","Western Star","Mumbai","Ahmedabad","18:30","06:30","12h",1190,"AC Sleeper",4.4,["Charging","Blanket"],30,["S4","S9","S15"]),
    bus("BUS127","Taj Roadways","Delhi","Agra","07:00","11:00","4h",650,"AC Seater",4.3,["Charging","Water"],32,["S2","S4","S12"]),
    bus("BUS128","Ganga Travels","Agra","Varanasi","20:00","06:00","10h",1100,"AC Sleeper",4.5,["Charging","Blanket"],30,["S3","S6","S11"]),
    bus("BUS129","Deccan Connect","Hyderabad","Pune","20:00","07:00","11h",1150,"AC Sleeper",4.4,["Charging","Blanket"],30,["S1","S8","S14"]),
    bus("BUS130","SouthLink","Chennai","Bengaluru","22:00","05:30","7h 30m",850,"AC Sleeper",4.5,["Charging","Blanket"],30,["S2","S6","S16"]),
    bus("BUS131","Eastern Express","Kolkata","Varanasi","19:00","07:00","12h",1400,"AC Sleeper",4.4,["Charging","Blanket","Water"],30,["S1","S9","S17"])
  ];
  const originalBuses = [...buses];
  const shiftTime = (time, minutes) => {
    const [hours, mins] = time.split(":").map(Number);
    const shifted = (hours * 60 + mins + minutes) % (24 * 60);
    return `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(shifted % 60).padStart(2, "0")}`;
  };
  while (buses.length < 100) {
    const index = buses.length - originalBuses.length;
    const template = originalBuses[index % originalBuses.length];
    const offset = (Math.floor(index / originalBuses.length) + 1) * 30;
    buses.push({
      ...template,
      id: `BUS${101 + buses.length}`,
      departure: shiftTime(template.departure, offset),
      arrival: shiftTime(template.arrival, offset),
      amenities: [...template.amenities],
      bookedSeats: [...template.bookedSeats]
    });
  }

  const tour = (id,name,destination,startHint,theme,days,price,rating,slots,interests,bestMonths,level,description,itinerary) =>
    ({id,name,destination,theme,days,nights:Math.max(days-1,0),
      duration: days === 1 ? "1 Day" : days + " Days / " + (days-1) + " Night" + (days > 2 ? "s" : ""),
      price,rating,slots,interests,bestMonths,level,description,itinerary,startHint});
  const tours = [
    tour("TOUR101","Goa Beach Escape","Goa","Pune","beach",3,5999,4.8,20,["beach","food","relax"],[11,12,1,2,3],"Easy","Beach time, local food, sunset viewpoints and a relaxed coastal stay.",["Arrive, check in and watch the sunset at Baga","North Goa forts, Anjuna flea market and seafood dinner","Old Goa churches, Panaji Latin Quarter and departure"]),
    tour("TOUR102","Mahabaleshwar Weekend","Mahabaleshwar","Pune","hills",2,3499,4.6,16,["mountains","nature","relax"],[6,7,8,9,11,12,1,2],"Easy","Hill viewpoints, strawberry farms and a scenic weekend escape.",["Arthur's Seat, Venna Lake boating and strawberry farm visit","Pratapgad Fort, Elephant's Head viewpoint and return"]),
    tour("TOUR103","Lonavala Getaway","Lonavala","Pune","hills",2,2799,4.5,22,["nature","adventure","food"],[6,7,8,9],"Easy","Waterfalls in season, forts, viewpoints and local chikki treats.",["Bhushi Dam, Tiger's Leap and Lonavala market","Lohagad Fort trek, Karla caves and return"]),
    tour("TOUR104","Shirdi Spiritual Tour","Shirdi","Mumbai","temple",2,3199,4.7,18,["spiritual","relax"],[1,2,3,4,5,6,7,8,9,10,11,12],"Easy","A convenient group trip with temple visit time and local transfers.",["Overnight journey, darshan and Dwarkamai visit","Shani Shingnapur excursion and return"]),
    tour("TOUR105","Rajasthan Heritage","Jaipur","Delhi","heritage",5,11999,4.8,14,["heritage","food","city"],[10,11,12,1,2,3],"Moderate","Forts, markets, architecture and regional cuisine.",["Amber Fort and Jaipur old city","City Palace, Jantar Mantar and Hawa Mahal","Bapu Bazaar food walk and block-printing workshop","Chokhi Dhani cultural evening","Sunrise at Nahargarh and departure"]),
    tour("TOUR106","Kerala Backwaters","Alleppey","Bengaluru","backwater",5,14999,4.7,12,["nature","relax","food"],[9,10,11,12,1,2,3],"Easy","Green landscapes, houseboat stay and relaxing nature experiences.",["Arrive in Kochi, Fort Kochi heritage walk","Drive to Alleppey, houseboat check-in","Backwater cruise and village life","Kumarakom bird sanctuary and Ayurveda session","Departure"]),
    tour("TOUR107","Manali Adventure","Manali","Delhi","snow",6,16999,4.6,15,["mountains","adventure","nature"],[3,4,5,6,9,10],"Challenging","Mountain scenery, guided sightseeing and optional adventure activities.",["Overnight Volvo to Manali","Hadimba Temple and Old Manali cafes","Solang Valley activities","Atal Tunnel and Sissu","Naggar Castle and Jogini Falls","Departure"]),
    tour("TOUR108","Mumbai City Experience","Mumbai","Pune","city",1,1999,4.4,25,["city","food","heritage"],[11,12,1,2,3],"Easy","Explore famous city sights, food stops and coastal views.",["Gateway of India, Colaba causeway, Marine Drive sunset and a street-food crawl"]),
    tour("TOUR109","Udaipur Lakes & Palaces","Udaipur","Jaipur","heritage",4,9499,4.8,14,["heritage","relax","city"],[10,11,12,1,2,3],"Easy","The City of Lakes: palaces, boat rides and rooftop sunsets.",["City Palace and Lake Pichola boat ride","Sajjangarh and Saheliyon ki Bari","Day trip to Kumbhalgarh Fort","Old-city shopping and departure"]),
    tour("TOUR110","Hampi Heritage Trail","Hampi","Bengaluru","heritage",3,6499,4.7,16,["heritage","adventure","nature"],[10,11,12,1,2],"Moderate","Boulder landscapes, Vijayanagara ruins and sunrise viewpoints.",["Virupaksha Temple and Hampi Bazaar","Vittala Temple, stone chariot and coracle ride","Matanga Hill sunrise and departure"]),
    tour("TOUR111","Rishikesh Rapids & Yoga","Rishikesh","Delhi","snow",4,8299,4.6,18,["adventure","spiritual","mountains"],[2,3,4,5,9,10,11],"Moderate","River rafting, riverside yoga and the Ganga aarti.",["Arrive, Laxman Jhula and Ganga aarti","Morning yoga and white-water rafting","Neelkanth Mahadev trek and waterfall","Meditation session and departure"]),
    tour("TOUR112","Nashik Vineyards & Temples","Nashik","Mumbai","temple",2,3899,4.5,20,["food","spiritual","relax"],[10,11,12,1,2,3],"Easy","Wine-estate tastings, Godavari ghats and temple trails.",["Vineyard tour and tasting, Ramkund evening aarti","Trimbakeshwar Temple, Pandavleni Caves and return"]),
    tour("TOUR113","Ajanta–Ellora Caves","Aurangabad","Pune","heritage",3,5299,4.7,16,["heritage","city"],[7,8,9,10,11,12,1,2,3],"Easy","UNESCO rock-cut caves, Bibi ka Maqbara and Daulatabad Fort.",["Bibi ka Maqbara, Panchakki and Aurangabad caves","Ellora Caves including the Kailasa Temple","Ajanta Caves and departure"])
  ];

  const photoByTheme = {
    beach:"photo-1512343879784-a960bf40e7f2", hills:"photo-1470770841072-f978cf4d019e",
    snow:"photo-1626621341517-bbf3d9990a23", heritage:"photo-1599661046827-dacff0c0f09a",
    temple:"photo-1606293926075-69a00dbfde81", city:"photo-1570168007204-dfb528c6958f",
    backwater:"photo-1602216056096-3b40cc0c9944"
  };
  const photosByDestination = {
    Goa:"photo-1512343879784-a960bf40e7f2", Mahabaleshwar:"photo-1500530855697-b586d89ba3ee",
    Lonavala:"photo-1470770841072-f978cf4d019e", Jaipur:"photo-1599661046827-dacff0c0f09a",
    Alleppey:"photo-1602216056096-3b40cc0c9944", Manali:"photo-1626621341517-bbf3d9990a23",
    Mumbai:"photo-1570168007204-dfb528c6958f", Udaipur:"photo-1599661046827-dacff0c0f09a",
    Hampi:"photo-1600100397608-f010b3c5a5c3", Rishikesh:"photo-1605640840605-14ac1855827b",
    Varanasi:"photo-1561361513-2d000a50f0dc", Agra:"photo-1564507592333-c60657eea523",
    Amritsar:"photo-1588096344356-58972c4b8a5e", Darjeeling:"photo-1544735716-392fe2489ffa",
    Pondicherry:"photo-1602216056096-3b40cc0c9944", Srinagar:"photo-1595815771614-ade9d652a65d",
    Leh:"photo-1519681393784-d120267933ba", Andaman:"photo-1510414842594-a61c69b5ae57",
    Paris:"photo-1502602898657-3e91760cbb34", London:"photo-1513635269975-59663e0ac1ad",
    Dubai:"photo-1512453979798-5ea266f8880c", Singapore:"photo-1525625293386-3f8f99389edd"
  };
  tours.forEach(t => { t.imageUrl = `https://images.unsplash.com/${photosByDestination[t.destination] || photoByTheme[t.theme]}?auto=format&fit=crop&w=960&q=82`; });

  const moreDestinations = [
    ["Gokarna","Karnataka",14.5479,74.3188,"beach",3,7299],["Munnar","Kerala",10.0889,77.0595,"hills",4,9999],
    ["Ooty","Tamil Nadu",11.4102,76.6950,"hills",3,7499],["Coorg","Karnataka",12.3375,75.8069,"hills",3,7999],
    ["Pondicherry","Puducherry",11.9416,79.8083,"beach",3,6999],["Varanasi","Uttar Pradesh",25.3176,82.9739,"temple",3,5999],
    ["Agra","Uttar Pradesh",27.1767,78.0081,"heritage",2,4499],["Amritsar","Punjab",31.6340,74.8723,"heritage",3,6799],
    ["Darjeeling","West Bengal",27.0410,88.2663,"hills",4,10999],["Kolkata","West Bengal",22.5726,88.3639,"city",3,6499],
    ["Chennai","Tamil Nadu",13.0827,80.2707,"city",2,4999],["Kochi","Kerala",9.9312,76.2673,"backwater",3,7599],
    ["Mysuru","Karnataka",12.2958,76.6394,"heritage",2,4299],["Jodhpur","Rajasthan",26.2389,73.0243,"heritage",3,7299],
    ["Jaisalmer","Rajasthan",26.9157,70.9083,"heritage",4,9999],["Ahmedabad","Gujarat",23.0225,72.5714,"heritage",2,4999],
    ["Srinagar","Jammu and Kashmir",34.0837,74.7973,"hills",5,15999],["Leh","Ladakh",34.1526,77.5771,"snow",6,22999],
    ["Dharamshala","Himachal Pradesh",32.2190,76.3234,"hills",3,8499],["Mussoorie","Uttarakhand",30.4598,78.0644,"hills",3,7999],
    ["Nainital","Uttarakhand",29.3919,79.4542,"hills",3,7999],["Puri","Odisha",19.8135,85.8312,"beach",3,6499],
    ["Madurai","Tamil Nadu",9.9252,78.1198,"temple",2,4999],["Kanyakumari","Tamil Nadu",8.0883,77.5385,"beach",3,6999],
    ["Tirupati","Andhra Pradesh",13.6288,79.4192,"temple",2,4599],["Nagpur","Maharashtra",21.1458,79.0882,"city",2,3999],
    ["Bhopal","Madhya Pradesh",23.2599,77.4126,"heritage",2,4499],["Indore","Madhya Pradesh",22.7196,75.8577,"city",2,4299],
    ["Bhubaneswar","Odisha",20.2961,85.8245,"temple",3,6499],["Gangtok","Sikkim",27.3389,88.6065,"hills",5,13999],
    ["Tawang","Arunachal Pradesh",27.5861,91.8594,"hills",6,17999],["Andaman","Andaman and Nicobar Islands",11.7401,92.6586,"beach",5,18999],
    ["Mount Abu","Rajasthan",24.5926,72.7156,"hills",3,7499],["Khajuraho","Madhya Pradesh",24.8318,79.9199,"heritage",2,4999],
    ["Jim Corbett","Uttarakhand",29.5300,78.7747,"nature",3,8999],["Kutch","Gujarat",23.7337,69.8597,"heritage",4,10999],
    ["Kathmandu","Nepal",27.7172,85.3240,"heritage",4,15999],["Bangkok","Thailand",13.7563,100.5018,"city",4,29999],
    ["Singapore","Singapore",1.3521,103.8198,"city",4,45999],["Dubai","United Arab Emirates",25.2048,55.2708,"city",4,38999],
    ["Paris","France",48.8566,2.3522,"city",5,89999],["London","United Kingdom",51.5072,-0.1276,"city",5,99999],
    ["Colombo","Sri Lanka",6.9271,79.8612,"beach",4,29999],["Kuala Lumpur","Malaysia",3.1390,101.6869,"city",4,36999]
  ];
  moreDestinations.forEach(([destination,state,lat,lng,theme,days,price], index) => {
    if (!cities[destination]) cities[destination] = { lat, lng, state };
    const id = "TOUR" + String(114 + index);
    const interests = theme === "beach" ? ["beach","food","relax"] : theme === "hills" || theme === "snow" ? ["mountains","nature","adventure"] : theme === "temple" ? ["spiritual","heritage"] : ["heritage","food","city"];
    const item = tour(id, `${destination} ${theme === "beach" ? "Coastal Escape" : theme === "hills" || theme === "snow" ? "Scenic Getaway" : "Discovery Tour"}`, destination, "Pune", theme === "nature" ? "hills" : theme, days, price, 4.4 + (index % 5) / 10, 12 + index % 12, interests, [10,11,12,1,2,3], "Easy", `Discover ${destination} with a curated itinerary, local highlights and time to explore at your own pace.`, [`Arrive in ${destination} and explore the best-known local highlights`, "Enjoy a guided local experience and regional food", "Visit a nearby attraction before departure"]);
    item.imageUrl = `https://images.unsplash.com/${photosByDestination[destination] || photoByTheme[item.theme]}?auto=format&fit=crop&w=960&q=82`;
    tours.push(item);
  });

  const coupons = [
    {code:"WELCOME10",type:"percent",value:10,minAmount:500,active:true,label:"10% off your first booking (min ₹500)"},
    {code:"TRAVEL15",type:"percent",value:15,minAmount:1500,active:true,label:"15% off fares of ₹1,500 and above"},
    {code:"WEEKEND",type:"flat",value:200,minAmount:1000,active:true,label:"Flat ₹200 off fares of ₹1,000 and above"}
  ];

  const interestOptions = ["beach","mountains","heritage","adventure","spiritual","food","nature","city","relax"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function haversineKm(a, b) {
    const R = 6371, rad = d => d * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Straight-line distance x 1.25 is only a rough road estimate, labelled "approx." in the UI.
  const roadKm = (a, b) => Math.round(haversineKm(cities[a], cities[b]) * 1.25);
  const busCities = () => [...new Set(buses.flatMap(b => [b.source, b.destination]))].sort();

  function suggestBusRoutes(source, destination, maxLegs = 3, limit = 3) {
    if (!cities[source] || !cities[destination] || source === destination) return [];
    const routes = [];
    function visit(city, visited, legs) {
      if (city === destination) {
        routes.push(legs);
        return;
      }
      if (legs.length >= maxLegs) return;
      buses.filter(b => b.source === city && !visited.has(b.destination))
        .forEach(bus => {
          const nextVisited = new Set(visited);
          nextVisited.add(bus.destination);
          visit(bus.destination, nextVisited, [...legs, {
            source: bus.source,
            destination: bus.destination,
            buses: buses.filter(candidate => candidate.source === bus.source && candidate.destination === bus.destination)
          }]);
        });
    }
    visit(source, new Set([source]), []);
    const unique = new Map();
    routes.forEach(legs => {
      const key = legs.map(leg => `${leg.source}>${leg.destination}`).join("|");
      if (unique.has(key)) return;
      const fare = legs.reduce((sum, leg) => sum + Math.min(...leg.buses.map(bus => bus.fare)), 0);
      unique.set(key, { legs, fare, transfers: legs.length - 1 });
    });
    return [...unique.values()]
      .sort((a, b) => a.transfers - b.transfers || a.fare - b.fare)
      .slice(0, limit);
  }

  return {cities, buses, tours, coupons, interestOptions, monthNames, haversineKm, roadKm, busCities, suggestBusRoutes};
});
