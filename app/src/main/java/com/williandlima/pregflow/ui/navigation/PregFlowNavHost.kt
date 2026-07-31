package com.williandlima.pregflow.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.williandlima.pregflow.ui.editor.SermonEditorScreen
import com.williandlima.pregflow.ui.home.HomeScreen

object PregFlowDestinations {
    const val HOME = "home"
    const val EDITOR_ARG_SERMON_ID = "sermonId"
    const val EDITOR = "editor/{$EDITOR_ARG_SERMON_ID}"

    fun editorRoute(sermonId: String) = "editor/$sermonId"
}

@Composable
fun PregFlowNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = PregFlowDestinations.HOME) {
        composable(PregFlowDestinations.HOME) {
            HomeScreen(
                onOpenSermon = { sermonId ->
                    navController.navigate(PregFlowDestinations.editorRoute(sermonId))
                },
            )
        }
        composable(
            route = PregFlowDestinations.EDITOR,
            arguments = listOf(navArgument(PregFlowDestinations.EDITOR_ARG_SERMON_ID) { type = NavType.StringType }),
        ) {
            SermonEditorScreen(onBack = { navController.popBackStack() })
        }
        // Próximas rotas (Fase 3+): Modo Pregação, busca bíblica, configurações, login.
    }
}
