
//----------------------------------------------------------------------
let retrieveAllData = () => {
    //1) Get user Latitude and Longitude and pass to #2.
    if (navigator.geolocation) { 
        navigator.geolocation.getCurrentPosition(retrieveUserDistrictDataFromCoords, ()=>{
            console.log("Location services not available. Please try again later.");
        });      
    } else {
        console.log("This browser does not support location services.");
    }
}
let retrieveUserDistrictDataFromCoords = (position) => {
    //2) Using Latitude and Longitude and geocod.io API, get user's current district data.
    let addressResultsAccuracyRatings = [];
    axios.get(`https://api.geocod.io/v1.3/reverse?q=${position.coords.latitude},${position.coords.longitude}&fields=cd&api_key=${geocodioAPIKey}`)
        .then((response)=> {
            console.log("RETRIEVED USER GEOPOL DATA BASED ON COORDINATES------------------------------");
            for (let x = 0; x < response.data.results.length; x++) {
                addressResultsAccuracyRatings.push(response.data.results[x].accuracy);
            }
            userGeneralPoliticalGeoData = response.data.results[addressResultsAccuracyRatings.indexOf(Math.max(...addressResultsAccuracyRatings))];
            for (let x = 0; x < userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators.length; x++) {
                if (userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators[x].type === "representative") {
                    userHouseRepProfile = userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators[x];
                    userHouseRepProfile.bio.img = `https://theunitedstates.io/images/congress/original/${userHouseRepProfile.references.bioguide_id}.jpg`;
                    userHouseRepProfile.bio.age = parseInt((currentDate.getFullYear())) - parseInt((new Date(userHouseRepProfile.bio.birthday)).getFullYear());
                    console.log(userGeneralPoliticalGeoData);
                    console.log("-----------------------------------------------------------------------------");
                    console.log("RETRIEVED INITIAL USER HOUSE REP PROFILE-------------------------------------");
                    console.log(userHouseRepProfile);
                    console.log("-----------------------------------------------------------------------------");
                }
            }
            retrieveUserHouseRepCommAppt();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserDistrictDataFromCoords");
            console.log(error);
    });
}


let retrieveUserHouseRepCommAppt = () => {
    axios.get(`https://theunitedstates.io/congress-legislators/committee-membership-current.json`)
        .then((response)=> {
            console.log("RETRIEVED USER HOUSE REP COMMITTEE APPOINTMENT SHORTNAMES--------------------");
            let committeeApptsWithShortNames = [];
            for (let x in response.data) {
                for (let y = 0; y < response.data[x].length; y++) {
                    if (response.data[x][y].bioguide === userHouseRepProfile.references.bioguide_id) {
                        let committeeAppt = response.data[x][y];
                        committeeAppt.comittee_thomas_id = x;
                        committeeAppt.subcomitteesRepIsIn = [];
                        committeeApptsWithShortNames.push(committeeAppt);
                        continue;
                    }
                }
            }
            userHouseRepProfile.committee_appts = committeeApptsWithShortNames;
            let indexToRemoveSubcomittees = [];
            for (let x = 0; x < userHouseRepProfile.committee_appts.length; x++) {
                for (let y = 0; y < userHouseRepProfile.committee_appts.length; y++) {
                    if (x !== y && userHouseRepProfile.committee_appts[x].comittee_thomas_id.length === 4) {
                        if (userHouseRepProfile.committee_appts[y].comittee_thomas_id.slice(0,4) === userHouseRepProfile.committee_appts[x].comittee_thomas_id) {
                            if (userHouseRepProfile.committee_appts[y].title === "undefined") {
                                userHouseRepProfile.committee_appts[y].title = "none";
                            }
                            userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn.push({subcommittee_thomas_id: userHouseRepProfile.committee_appts[y].comittee_thomas_id, rank: userHouseRepProfile.committee_appts[y].rank, title: userHouseRepProfile.committee_appts[y].title});
                            indexToRemoveSubcomittees.push(y);
                        }
                    }
                }
            }
            while(indexToRemoveSubcomittees.length) {
                userHouseRepProfile.committee_appts.splice(indexToRemoveSubcomittees.pop(), 1);
            }
            console.log(userHouseRepProfile);
            console.log("-----------------------------------------------------------------------------");
            retrieveUserHouseRepCommApptText();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserHouseRepCommAppt");
            console.log(error);
    });
}

let retrieveUserHouseRepCommApptText = () => {
    axios.get(`https://theunitedstates.io/congress-legislators/committees-current.json`)
        .then((response)=> {
            console.log("RETRIEVED USER HOUSE REP COMMITTEE APPOINTMENT LONGNAMES--------------------"); 
            for (let x = 0; x < response.data.length; x++) {
                for (let y = 0; y < userHouseRepProfile.committee_appts.length; y++) {
                    if (response.data[x].thomas_id === userHouseRepProfile.committee_appts[y].comittee_thomas_id) {
                        userHouseRepProfile.committee_appts[y].committee_info = response.data[x];
                    }
                } 
            } 
            for (let a = 0; a < userHouseRepProfile.committee_appts.length; a++) {
                for (let b = 0; b < userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn.length; b++) {
                    for (let c = 0; c < userHouseRepProfile.committee_appts[a].committee_info.subcommittees.length; c++) { 
                        if (userHouseRepProfile.committee_appts[a].committee_info.subcommittees[c].thomas_id === userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn[b].subcommittee_thomas_id.slice(4)) {
                            userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn[b].subcomittee_info = userHouseRepProfile.committee_appts[a].committee_info.subcommittees[c];
                        }
                    }
                }
            }
            console.log(userHouseRepProfile);
            console.log("-----------------------------------------------------------------------------");
            getNextCandidatesFromDistrict();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserHouseRepCommApptText");
            console.log(error);
    });
}


let getNextCandidatesFromDistrict = () => {
    //this returns depending on year candidates in a certain year
    //i should search by elections and find if current year or current year + 1 will yield
    let districtNum;
    if (userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number < 10) {
        districtNum = "0" + userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number;
    }
    else {
        districtNum = userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number; 
    }
    axios.get(`https://api.open.fec.gov/v1/candidates/?year=${currentDate.getFullYear()}&district=${districtNum}&sort=name&page=1&election_year=${  currentDate.getFullYear()}&api_key=${fecAPIKey}&state=${userGeneralPoliticalGeoData.address_components.state}&office=H&per_page=100`)
        .then((response)=> {
            console.log("RETRIEVED CANDIDATES FROM DISTRICT-------------------------------------------------");
            console.log(response);
            //
            document.getElementById("yourCurrentRepName").innerHTML= `<a href = '${userHouseRepProfile.contact.url}'>${userHouseRepProfile.bio.first_name} ${userHouseRepProfile.bio.last_name}</a>`;
            document.getElementById("yourCurrentRepJurisdiction").innerText= `(${userHouseRepProfile.bio.party} - ${userGeneralPoliticalGeoData.address_components.state})`;
            document.getElementById("yourCurrentRepDistrict").innerText= `${userGeneralPoliticalGeoData.fields.congressional_districts[0].name}`;
            document.getElementById("yourCurrentRepOfficeAndPhone").innerHTML= `DC OFFICE: <br>${userHouseRepProfile.contact.address}<br>${userHouseRepProfile.contact.phone}`;
            document.getElementById("yourCurrentRepOfficeAndPhone").style.textAlign = "center";
            document.getElementById("yourCurrentRepPic").src = `${userHouseRepProfile.bio.img}`;
            document.getElementById("yourCurrentRepCommitteeAppts").innerHTML = `COMMITTEE APPOINTMENTS [${userHouseRepProfile.committee_appts.length}]:`;
            for (let x = 0; x < userHouseRepProfile.committee_appts.length; x++) {
                let committee = document.createElement("h2");
                committee.innerHTML = `<a href = '${userHouseRepProfile.committee_appts[x].committee_info.minority_url}'>${userHouseRepProfile.committee_appts[x].committee_info.name} - Rank: ${userHouseRepProfile.committee_appts[x].rank}</a>`;
                document.getElementById("main").appendChild(committee);
                let committeeSummary = document.createElement("h3");
                committeeSummary.classList.add("summary");
                committeeSummary.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.jurisdiction}`;
                let committeePhone = document.createElement("h3");
                committeePhone.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.phone}`;
                let committeeAddress = document.createElement("h3");
                committeeAddress.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.address}`;

                [committeeSummary, committeePhone, committeeAddress].forEach((element)=>{
                    document.getElementById("main").appendChild(element);
                });

                
                let subcommitteesList = document.createElement("ul");
                if (userHouseRepProfile.committee_appts[x].rank === 1) {
                    let title = document.createElement("li");
                    title.innerHTML = "<em>RANKING MEMBER</em>";
                    subcommitteesList.appendChild(title);   
                }
                else {
                    for (let y = 0; y < userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn.length; y++) {
                        let subcommittee = document.createElement("li");
                        let title;
                        if (userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].title === undefined) {
                            title = "none";
                        }
                        else {
                            title = userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].title;
                        }
                        subcommittee.innerHTML = `Subcommittee: ${userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].subcomittee_info.name}<br> Title: ${title}<br> Rank: ${userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].rank}`;
                        subcommitteesList.appendChild(subcommittee);
                    }
                }
                document.getElementById("main").appendChild(subcommitteesList);
            }
            let contactHeader = document.createElement("h1");
            contactHeader.innerText = "SOCIAL MEDIA";
            document.getElementById("main").appendChild(contactHeader);
            let contactList = document.createElement("ul");

            for (let x in userHouseRepProfile.social) {
                if (x.toString() === "rss_url" || x.toString() === "youtube_id") {
                    continue;
                }
                let contact = document.createElement("li");
                contact.innerHTML = `<a href = 'http://${x.toString()}.com/${userHouseRepProfile.social[x]}' target = '_blank'>${x.toString().toUpperCase()}</a>`;
                contactList.appendChild(contact)
            } 
            document.getElementById("main").appendChild(contactList);

            let nextPrimary = document.createElement("h1");
            nextPrimary.innerText = "NEXT PRIMARY CANDIDATES:";
            document.getElementById("main").appendChild(nextPrimary);
            let nextList = document.createElement("ul");
            for (let x = 0; x < response.data.results.length; x++) {
                let candidate = document.createElement("li");
                candidate.innerHTML = `Name: ${response.data.results[x].name}<br> Party: ${response.data.results[x].party_full}<br> Challenge Status: ${response.data.results[x].incumbent_challenge_full}`
                nextList.appendChild(candidate);

            }
            document.getElementById("main").appendChild(nextList);

            

            
            
            

            
            //
            console.log("-----------------------------------------------------------------------------");
        })
        .catch((error)=> {
            console.log("FAILED AT getNextCandidatesFromDistrict");
            console.log(error);
    });
}




//----------------------------------------------------------------------

let geocodioAPIKey = "789c52982879780b2ab22e775c79899bb578c25";
let fecAPIKey = "G2GcVatldeVNYrmcgrogA6DRyQWhCBQOoDU7qVC9";
let currentDate = new Date();

let userGeneralPoliticalGeoData = {};
let userHouseRepProfile = {};
let electionData = {};




retrieveAllData();























/*
let retrieveRepresentativesData = (retrievedZipCode) => {
    axios.get(`https://whoismyrepresentative.com/getall_mems.php?zip=${retrievedZipCode}&output=json`)
        .then((response) => {
            console.log(response);
            representativesData = response;
        })
        .catch((error)=> {
            console.log(error);
    });
}*/
//------------------------USE GOOGLE GEOCODE API TO GET ZIP CODE FROM LAT LONG
/* 
let retrieveLocationData = (position) => {
    let userData = {lat: position.coords.latitude, lng: position.coords.longitude};
    axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${userData.lat},${userData.lng}&key=AIzaSyCIny_pi_-OpegLTAf2iV4ebra20U62ciM`)
        .then((response)=> {
        for (let x = 0; x < response.data.results.length; x++) {
            for (let y = 0; y < response.data.results[x].address_components.length; y++) {
                if  (response.data.results[x].address_components[y].types.includes("postal_code")) {
                    //console.log(response.data.results[x]);
                    userData.zipCode = response.data.results[x].address_components[y].long_name;
                }
                if  (response.data.results[x].address_components[y].types.includes("administrative_area_level_1")){
                    //console.log(response.data.results[x]);
                    userData.state = response.data.results[x].address_components[y].short_name;
                }
            }
        }
        console.log(userData);
        retrieveRepresentativesData(userData.zipCode);
        })
        .catch((error)=> {
        console.log(error);
    });
}
*/