const DeddyBirthDate = "2000-06-15"
function yearCalculation(birthDate){
    let birthDateEpoch = new Date(birthDate)
    let yearDiff = Date.now() - birthDateEpoch
    let diffDate = new Date(yearDiff)
    return Math.abs(diffDate.getUTCFullYear() - 1970)
}

$("#age").text(yearCalculation(DeddyBirthDate))