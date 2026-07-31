package com.williandlima.pregflow.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.williandlima.pregflow.ui.home.HomeScreen

object PregFlowDestinations {
    const val HOME = "home"
}

@Composable
fun PregFlowNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = PregFlowDestinations.HOME) {
        composable(PregFlowDestinations.HOME) {
            HomeScreen()
        }
        // Próximas rotas (Fase 2+): editor de sermão, modo pregação, busca
        // bíblica, configurações, login.
    }
}
